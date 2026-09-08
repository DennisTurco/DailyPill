import json
import logging
import subprocess
import threading
import time
from typing import Any

import httpx

from app.config import settings
from app.services.gpu_service import detect_nvidia_gpu

_OLLAMA_ALL_GPU_LAYERS = 999
_OLLAMA_START_RETRIES = 60
_OLLAMA_START_RETRY_DELAY_SECONDS = 1

logger = logging.getLogger(__name__)


class OllamaUnavailableError(Exception):
    pass


class OllamaService:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: int | None = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS
        self.gpu_enabled = detect_nvidia_gpu()
        self._pull_lock = threading.Lock()
        self._pull_state: dict[str, Any] = {"pulling": False, "model": None, "status": None, "percent": None}

    def _generate(self, prompt: str, system: str | None = None, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system:
            payload["system"] = system
        if json_mode:
            payload["format"] = "json"
        if self.gpu_enabled:
            payload["options"] = {"num_gpu": _OLLAMA_ALL_GPU_LAYERS}

        try:
            response = httpx.post(f"{self.base_url}/api/generate", json=payload, timeout=self.timeout)
            if response.status_code == 404:
                raise OllamaUnavailableError(
                    f"Model '{self.model}' is not available in Ollama at {self.base_url}. "
                    f"Pull it first with: ollama pull {self.model}"
                )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise OllamaUnavailableError(f"Could not reach Ollama at {self.base_url}: {exc}") from exc

        data = response.json()
        return data.get("response", "")

    def is_available(self) -> bool:
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    def bootstrap(self) -> None:
        """Ensure Ollama is running and the configured model is present. Runs in the background."""
        threading.Thread(target=self._bootstrap, daemon=True).start()

    def _bootstrap(self) -> None:
        if not self.is_available():
            self._start_ollama()
            for _ in range(_OLLAMA_START_RETRIES):
                time.sleep(_OLLAMA_START_RETRY_DELAY_SECONDS)
                if self.is_available():
                    break
        # No-ops quietly if Ollama still isn't reachable at this point.
        self.ensure_model_pulled()

    def _start_ollama(self) -> None:
        """Try to launch the local Ollama server (only does something if it isn't already running)."""
        try:
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            logger.info("Launched 'ollama serve' since Ollama was not reachable at %s", self.base_url)
        except FileNotFoundError:
            logger.warning(
                "Ollama is not reachable at %s and the 'ollama' executable was not found on PATH; "
                "install Ollama or start it manually.",
                self.base_url,
            )
        except OSError as exc:
            logger.warning("Could not launch Ollama automatically: %s", exc)

    def has_model(self) -> bool | None:
        """Returns True/False if Ollama answered, or None if it couldn't be reached at all."""
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
        except httpx.HTTPError:
            return None
        names = [m.get("name", "") for m in response.json().get("models", [])]
        return any(n == self.model or n.split(":")[0] == self.model for n in names)

    def get_pull_state(self) -> dict[str, Any]:
        with self._pull_lock:
            return dict(self._pull_state)

    def _set_pull_state(self, **kwargs: Any) -> None:
        with self._pull_lock:
            self._pull_state.update(kwargs)

    def ensure_model_pulled(self) -> None:
        """Kick off a background download of `self.model` if it's confirmed missing (not just unreachable)."""
        if self.has_model() is not False:
            return
        with self._pull_lock:
            if self._pull_state["pulling"]:
                return
            self._pull_state.update({"pulling": True, "model": self.model, "status": "starting", "percent": None})
        threading.Thread(target=self._pull_model, daemon=True).start()

    def _pull_model(self) -> None:
        try:
            with httpx.stream(
                "POST", f"{self.base_url}/api/pull", json={"name": self.model, "stream": True}, timeout=None
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    total = data.get("total")
                    completed = data.get("completed")
                    percent = round(completed / total * 100, 1) if total and completed else None
                    self._set_pull_state(status=data.get("status"), percent=percent)
        except httpx.HTTPError as exc:
            self._set_pull_state(status=f"error: {exc}")
        finally:
            self._set_pull_state(pulling=False)

    def generate_questions(self, topic_name: str, prompt: str, count: int, difficulty: int | None) -> list[dict]:
        difficulty_hint = f"target difficulty {difficulty} (1=easiest, 5=hardest)" if difficulty else "mixed difficulty 1-5"
        system = (
            "You are a quiz question generator. Respond ONLY with valid JSON: "
            '{"questions": [{"type": "multiple_choice|completion|single_word|open_answer", '
            '"text": str, "options": [str] or null, "correct_answer": str, '
            '"difficulty": int 1-5, "explanation": str or null}]}. '
            "correct_answer is REQUIRED and must be a non-empty string for every question, with no exceptions. "
            "For multiple_choice, options must contain 4 items and correct_answer must equal one of them exactly. "
            "For open_answer, correct_answer must contain a concise reference/model answer (a few sentences) "
            "even though explanation may repeat or expand on it."
        )
        user_prompt = (
            f"Topic: {topic_name}\n"
            f"Instructions: {prompt}\n"
            f"Generate exactly {count} questions, {difficulty_hint}."
        )
        raw = self._generate(user_prompt, system=system, json_mode=True)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise OllamaUnavailableError(f"Ollama returned invalid JSON: {exc}") from exc
        return parsed.get("questions", [])

    def generate_info_facts(self, topic_name: str, prompt: str, count: int) -> list[dict]:
        system = (
            "You are writing short, accurate educational facts for a daily-learning app. Respond ONLY with valid JSON: "
            '{"facts": [{"title": str, "description": str, "link": str or null}]}. '
            "title is a short headline (max ~10 words). description is 2-4 sentences, self-contained and accurate, "
            "understandable without any other context. link, if included, must be a real, well-known reference URL "
            "(e.g. Wikipedia or official docs) directly relevant to the fact; use null if unsure."
        )
        user_prompt = (
            f"Topic: {topic_name}\n"
            f"Instructions: {prompt}\n"
            f"Generate exactly {count} distinct facts."
        )
        raw = self._generate(user_prompt, system=system, json_mode=True)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise OllamaUnavailableError(f"Ollama returned invalid JSON: {exc}") from exc
        return parsed.get("facts", [])

    def review_open_answer(self, question_text: str, correct_answer: str, given_answer: str) -> dict:
        system = (
            "You are grading a quiz answer. Respond ONLY with valid JSON: "
            '{"is_correct": bool, "feedback": str}. Feedback should briefly explain why the answer '
            "is right or wrong, in a friendly tone."
        )
        user_prompt = (
            f"Question: {question_text}\n"
            f"Expected answer: {correct_answer}\n"
            f"User's answer: {given_answer}"
        )
        raw = self._generate(user_prompt, system=system, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise OllamaUnavailableError(f"Ollama returned invalid JSON: {exc}") from exc

    def chat_about_quiz(
        self, topic_name: str, results: list[dict], history: list[dict], user_message: str
    ) -> str:
        system = (
            "You are a friendly tutor helping a student review a quiz they just completed. "
            "Answer their follow-up questions using the quiz context below. Be concise and clear. "
            "If they ask something unrelated to the quiz or its topic, gently steer them back."
        )
        context_lines = [
            f"- Q: {r['text']} | given: {r['given_answer']} | correct: {r['correct_answer']} | was_correct: {r['is_correct']}"
            for r in results
        ]
        conversation_lines = [f"{h['role']}: {h['content']}" for h in history]

        prompt_parts = [f"Topic: {topic_name}", "Quiz results:", "\n".join(context_lines)]
        if conversation_lines:
            prompt_parts += ["", "Conversation so far:", "\n".join(conversation_lines)]
        prompt_parts += ["", f"Student's new question: {user_message}"]

        return self._generate("\n".join(prompt_parts), system=system, json_mode=False)

    def generate_quiz_recap(self, topic_name: str, results: list[dict]) -> str:
        system = (
            "You are a friendly tutor writing a short end-of-quiz recap (3-6 sentences). "
            "Summarize performance and explain the mistakes in plain language."
        )
        lines = [
            f"- Q: {r['text']} | given: {r['given_answer']} | correct: {r['correct_answer']} | was_correct: {r['is_correct']}"
            for r in results
        ]
        user_prompt = f"Topic: {topic_name}\nResults:\n" + "\n".join(lines)
        return self._generate(user_prompt, system=system, json_mode=False)


ollama_service = OllamaService()
