import { useMicrophones } from "../lib/microphone";

/** Picks the input device used for voice answers; the choice is shared by every voice button. */
export function MicrophoneSelect({ id = "microphone-select" }: { id?: string }) {
  const { devices, selectedId, selectedAvailable, needsPermission, error, requestPermission, select } = useMicrophones();

  return (
    <div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <select
          id={id}
          value={selectedAvailable ? selectedId ?? "" : ""}
          onChange={(e) => select(e.target.value || null)}
          disabled={needsPermission}
          style={{ flex: 1, minWidth: 200 }}
        >
          <option value="">System default</option>
          {!needsPermission &&
            devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Microphone ${i + 1}`}
              </option>
            ))}
        </select>
        {needsPermission && (
          <button className="secondary" onClick={requestPermission} title="Browsers only list microphones after access is granted">
            <i className="fa-solid fa-unlock" /> Show microphones
          </button>
        )}
      </div>
      {!selectedAvailable && (
        <div className="warning text-sm" style={{ marginTop: 4 }}>
          The saved microphone isn't connected; the system default will be used.
        </div>
      )}
      {error && <div className="error text-sm" style={{ marginTop: 4 }}>{error}</div>}
    </div>
  );
}
