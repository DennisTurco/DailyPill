import { useEffect, useRef, useState } from "react";
import { ProgressTrend, TrendPoint } from "../lib/types";

const HEIGHT = 240;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 44 };
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

interface Series {
  key: string;
  label: string;
  color: string;
  points: TrendPoint[];
}

function formatWeek(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/** Splits a series into runs of consecutive weeks that have a value, so weeks without data leave a gap. */
function segments(points: TrendPoint[]) {
  const runs: { index: number; accuracy: number }[][] = [];
  let current: { index: number; accuracy: number }[] = [];
  points.forEach((p, index) => {
    if (p.accuracy === null) {
      if (current.length) runs.push(current);
      current = [];
    } else {
      current.push({ index, accuracy: p.accuracy });
    }
  });
  if (current.length) runs.push(current);
  return runs;
}

/**
 * Weekly accuracy line: each point is the share of questions answered so far whose latest answer is
 * correct, so it tracks mastery over time. Optionally overlays one topic against the overall line.
 */
export function AccuracyTrendChart({ trend }: { trend: ProgressTrend }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [topicId, setTopicId] = useState<number | "">("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const topic = trend.by_topic.find((t) => t.topic_id === topicId);
  const series: Series[] = [
    { key: "overall", label: "All topics", color: "var(--series-1)", points: trend.overall },
    ...(topic ? [{ key: "topic", label: topic.topic_name, color: "var(--series-2)", points: topic.points }] : []),
  ];

  const weeks = trend.overall.map((p) => p.week_start);
  const hasData = trend.overall.some((p) => p.accuracy !== null);
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (i: number) => MARGIN.left + (weeks.length > 1 ? (i / (weeks.length - 1)) * plotWidth : plotWidth / 2);
  const y = (accuracy: number) => MARGIN.top + (1 - accuracy) * plotHeight;
  // Thin out week labels so they never collide (~64px per label).
  const labelEvery = Math.max(1, Math.ceil(weeks.length / Math.max(1, Math.floor(plotWidth / 64))));

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relative = (e.clientX - rect.left) / rect.width;
    setHoverIndex(Math.round(relative * (weeks.length - 1)));
  }

  const hovered = hoverIndex !== null ? hoverIndex : null;
  // Sit beside the crosshair (flipping sides past the middle) so the tooltip never covers the hovered points.
  const tooltipStyle =
    hovered === null
      ? {}
      : x(hovered) > width / 2
        ? { right: width - x(hovered) + 12 }
        : { left: x(hovered) + 12 };

  return (
    <div className="card trend-chart">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>
          <i className="fa-solid fa-chart-line" /> Accuracy over time
        </h3>
        <div className="row">
          {trend.by_topic.length > 0 && (
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : "")}
              aria-label="Compare with topic"
              style={{ width: "auto" }}
            >
              <option value="">Compare with a topic…</option>
              {trend.by_topic.map((t) => (
                <option key={t.topic_id} value={t.topic_id}>
                  {t.topic_name}
                </option>
              ))}
            </select>
          )}
          <button className="btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} disabled={!hasData}>
            <i className={showTable ? "fa-solid fa-chart-line" : "fa-solid fa-table"} /> {showTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>
      <p className="text-muted" style={{ margin: "0 0 8px", fontSize: 12.5 }}>
        Share of questions answered so far whose latest answer is correct, at the end of each week.
      </p>

      {series.length > 1 && (
        <div className="trend-legend">
          {series.map((s) => (
            <span key={s.key} className="trend-legend-item">
              <span className="trend-legend-swatch" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} style={{ position: "relative" }}>
        {!hasData ? (
          <div className="text-muted" style={{ padding: "32px 0", textAlign: "center" }}>
            Complete a quiz to start tracking your accuracy over time.
          </div>
        ) : showTable ? (
          <div className="scroll-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Week of</th>
                  {series.map((s) => (
                    <th key={s.key}>{s.label}</th>
                  ))}
                  <th>Answers that week</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, i) => (
                  <tr key={week}>
                    <td>{formatWeek(week)}</td>
                    {series.map((s) => (
                      <td key={s.key}>{formatPercent(s.points[i].accuracy)}</td>
                    ))}
                    <td>{trend.overall[i].answers_this_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <svg width={width} height={HEIGHT} role="img" aria-label="Weekly accuracy trend" style={{ display: "block" }}>
              {Y_TICKS.map((tick) => (
                <g key={tick}>
                  <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className="trend-grid" />
                  <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="trend-axis-label">
                    {tick * 100}%
                  </text>
                </g>
              ))}
              {weeks.map((week, i) =>
                i % labelEvery === (weeks.length - 1) % labelEvery ? (
                  <text key={week} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="trend-axis-label">
                    {formatWeek(week)}
                  </text>
                ) : null,
              )}

              {hovered !== null && (
                <line x1={x(hovered)} x2={x(hovered)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="trend-crosshair" />
              )}

              {series.map((s) => (
                <g key={s.key}>
                  {segments(s.points).map((run) => (
                    <polyline
                      key={run[0].index}
                      points={run.map((p) => `${x(p.index)},${y(p.accuracy)}`).join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                  {s.points.map((p, i) =>
                    p.accuracy === null ? null : (
                      <circle
                        key={i}
                        cx={x(i)}
                        cy={y(p.accuracy)}
                        r={hovered === i ? 5 : 4}
                        fill={s.color}
                        className="trend-marker"
                      />
                    ),
                  )}
                </g>
              ))}

              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setHoverIndex(null)}
              />
            </svg>

            {hovered !== null && (
              <div className="trend-tooltip" style={tooltipStyle}>
                <div className="trend-tooltip-title">Week of {formatWeek(weeks[hovered])}</div>
                {series.map((s) => (
                  <div key={s.key} className="trend-tooltip-row">
                    <span className="trend-legend-swatch" style={{ background: s.color }} />
                    <span>{s.label}</span>
                    <strong>{formatPercent(s.points[hovered].accuracy)}</strong>
                  </div>
                ))}
                <div className="trend-tooltip-meta">
                  {trend.overall[hovered].questions_answered} questions answered so far ·{" "}
                  {trend.overall[hovered].answers_this_week} answers this week
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
