import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { InfoFact } from "../lib/types";

export default function InfoFactPopupPage() {
  const [fact, setFact] = useState<InfoFact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<InfoFact>("/info-facts/daily")
      .then(setFact)
      .catch((err) => setError(String(err)));
  }, []);

  function close() {
    window.dailyPill?.closeWindow();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "100%" }}>
        {error && <div className="error">{error}</div>}
        {!error && !fact && <div>Loading...</div>}
        {fact && (
          <>
            <h3 style={{ marginTop: 0 }}>{fact.title}</h3>
            <p>{fact.description}</p>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
              {fact.link ? (
                <a href={fact.link} target="_blank" rel="noreferrer">
                  Learn more →
                </a>
              ) : (
                <span />
              )}
              <button onClick={close}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
