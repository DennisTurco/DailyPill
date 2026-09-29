import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { startVoiceRecording, VoiceRecording } from "../lib/voiceRecorder";

type RecordingState = "idle" | "recording" | "transcribing";

/**
 * Records a spoken answer and hands back the Whisper transcript. The prompt (usually the
 * question text) helps Whisper spell technical terms the way the question does.
 */
export function VoiceAnswerButton({ prompt, onTranscript }: { prompt: string; onTranscript: (text: string) => void }) {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<VoiceRecording | null>(null);

  useEffect(() => () => recordingRef.current?.cancel(), []);

  async function start() {
    setError(null);
    try {
      recordingRef.current = await startVoiceRecording();
      setState("recording");
    } catch (err) {
      setError(`Microphone unavailable: ${String(err)}`);
    }
  }

  async function stop() {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setState("transcribing");
    try {
      const wav = await recording.stop();
      const formData = new FormData();
      formData.append("audio", wav, "answer.wav");
      formData.append("prompt", prompt);
      const response = await api.upload<{ text: string }>("/ai/transcribe", formData);
      if (response.text) onTranscript(response.text);
      else setError("No speech detected, try again.");
    } catch (err) {
      setError(String(err));
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="row" style={{ marginTop: 8 }}>
      {state === "recording" ? (
        <button className="danger" onClick={stop}>
          <i className="fa-solid fa-stop" /> Stop recording
        </button>
      ) : (
        <button className="secondary" disabled={state === "transcribing"} onClick={start}>
          <i className="fa-solid fa-microphone" /> {state === "transcribing" ? "Transcribing..." : "Answer by voice"}
        </button>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
