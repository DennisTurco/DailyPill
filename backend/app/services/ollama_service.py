import json
from typing import Any

import httpx

from app.config import settings


class OllamaUnavailableError(Exception):
    pass


class OllamaService:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: int | None = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT_SECONDS

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

    def generate_questions(self, topic_name: str, prompt: str, count: int, difficulty: int | None) -> list[dict]:
        difficulty_hint = f"target difficulty {difficulty} (1=easiest, 5=hardest)" if difficulty else "mixed difficulty 1-5"
        system = (
            "You are a quiz question generator. Respond ONLY with valid JSON: "
            '{"questions": [{"type": "multiple_choice|completion|single_word|open_answer", '
            '"text": str, "options": [str] or null, "correct_answer": str, '
            '"difficulty": int 1-5, "explanation": str or null}]}. '
            "For multiple_choice, options must contain 4 items and correct_answer must equal one of them exactly."
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
