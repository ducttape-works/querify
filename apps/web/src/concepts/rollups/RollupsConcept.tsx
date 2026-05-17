import { useState } from "react";
import "../btree/btree.css";
import "./rollups.css";

type RlPhase = "idle" | "raw" | "rollup1" | "rollup5";

type RawRow = { ts: string; value: number };
type RollupRow = { bucket: string; avg: number; min: number; max: number; count: number };

function fmt2(n: number) {
  return n.toFixed(2);
}

const RAW_VALUES = [
  42.3, 45.1, 47.8, 44.2,
  41.7, 38.9, 43.2, 46.5,
  52.1, 49.8, 51.3, 53.7,
  38.4, 36.9, 40.2, 37.8,
  60.1, 62.4, 58.9, 59.3,
];

const RAW_ROWS: RawRow[] = RAW_VALUES.map((v, i) => {
  const totalSecs = i * 15;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return {
    ts: `00:0${mins}:${secs.toString().padStart(2, "0")}`,
    value: v,
  };
});

function buildRollup1(): RollupRow[] {
  const buckets: RollupRow[] = [];
  for (let m = 0; m < 5; m++) {
    const slice = RAW_VALUES.slice(m * 4, m * 4 + 4);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    buckets.push({
      bucket: `00:0${m}:00`,
      avg,
      min: Math.min(...slice),
      max: Math.max(...slice),
      count: slice.length,
    });
  }
  return buckets;
}

function buildRollup5(): RollupRow[] {
  const r1 = buildRollup1();
  const avgs = r1.map((r) => r.avg);
  return [
    {
      bucket: "00:00:00",
      avg: avgs.reduce((a, b) => a + b, 0) / avgs.length,
      min: Math.min(...r1.map((r) => r.min)),
      max: Math.max(...r1.map((r) => r.max)),
      count: RAW_VALUES.length,
    },
  ];
}

const ROLLUP1 = buildRollup1();
const ROLLUP5 = buildRollup5();

type RangeOption = {
  label: string;
  description: string;
  tier: "raw" | "1min" | "5min";
  reason: string;
};

const RANGE_OPTIONS: RangeOption[] = [
  {
    label: "Last 30 seconds",
    description: "High resolution needed, very recent data",
    tier: "raw",
    reason:
      "A 30-second window needs sub-minute precision. Only the raw 15-second data can answer this accurately.",
  },
  {
    label: "Last 10 minutes",
    description: "Recent trend view",
    tier: "1min",
    reason:
      "10 minutes of data. The 1-minute rollup has exactly the right resolution, raw data would return 40 rows, rollup returns 10. Same answer, less I/O.",
  },
  {
    label: "Last 2 hours",
    description: "Broader trend analysis",
    tier: "5min",
    reason:
      "Over 2 hours, reading raw 15-second samples would mean 480 rows. The 5-minute rollup gives a useful aggregate with far less data to scan. Raw resolution is wasted at this scale.",
  },
];

export function RollupsConcept() {
  const [phase, setPhase] = useState<RlPhase>("idle");
  const [selectedRange, setSelectedRange] = useState<RangeOption | null>(null);

  function rollupSQL(): string {
    if (phase === "idle" || phase === "raw") {
      return `-- Create a 1-minute materialized view rollup
CREATE MATERIALIZED VIEW metrics_1min AS
  SELECT
    date_trunc('minute', ts)  AS bucket,
    avg(value)                AS avg,
    min(value)                AS min,
    max(value)                AS max,
    count(*)                  AS count
  FROM metrics
  GROUP BY 1;

-- Refresh manually (or on a schedule)
REFRESH MATERIALIZED VIEW metrics_1min;`;
    }
    if (phase === "rollup1") {
      return `-- Build 5-minute rollup from 1-minute rollup
CREATE MATERIALIZED VIEW metrics_5min AS
  SELECT
    date_trunc('hour', bucket)
      + interval '5 min'
        * floor(extract(minute FROM bucket) / 5) AS bucket,
    avg(avg)   AS avg,
    min(min)   AS min,
    max(max)   AS max,
    sum(count) AS count
  FROM metrics_1min
  GROUP BY 1;

-- TimescaleDB continuous aggregate (auto-refreshes)
CREATE MATERIALIZED VIEW metrics_5min
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('5 minutes', ts) AS bucket,
    avg(value), min(value), max(value)
  FROM metrics
  GROUP BY 1;`;
    }
    if (!selectedRange) {
      return `-- All three tiers are ready.
-- Pick a time range above to see which tier the
-- query planner selects and the SQL it would run.`;
    }
    if (selectedRange.tier === "raw") {
      return `-- Last 30 s → raw tier (sub-minute resolution needed)
SELECT ts, value
FROM metrics
WHERE ts >= now(), interval '30 seconds'
ORDER BY ts DESC;`;
    }
    if (selectedRange.tier === "1min") {
      return `-- Last 10 min → 1-minute rollup
-- (40 raw rows → 10 rollup rows, same result)
SELECT bucket, avg, min, max
FROM metrics_1min
WHERE bucket >= now(), interval '10 minutes'
ORDER BY bucket DESC;`;
    }
    return `-- Last 2 h → 5-minute rollup
-- (480 raw rows → 24 rollup rows, same trend)
SELECT bucket, avg, min, max, count
FROM metrics_5min
WHERE bucket >= now(), interval '2 hours'
ORDER BY bucket DESC;`;
  }

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual" style={{ alignItems: "flex-start", overflow: "auto" }}>
            <div className="rl-wrap">
              {phase === "idle" && (
                <div className="sh-empty-state">
                  <div className="sh-empty-title">Rollups and Pre-Aggregation</div>
                  <div className="sh-empty-sub">
                    A rollup pre-computes aggregates (avg, min, max) at lower resolutions so that
                    long-range queries can read far fewer rows. Load raw data to start.
                  </div>
                  <button
                    className="concept-btn accent"
                    onClick={() => setPhase("raw")}
                  >
                    Load Raw Data
                  </button>
                </div>
              )}

              {phase !== "idle" && (
                <div className="rl-tiers">
                  <div className="rl-tier">
                    <div className="rl-tier-head">
                      <span className="rl-tier-name">Raw Data</span>
                      <span className="rl-tier-res">15-second resolution</span>
                      <span className="rl-tier-count">{RAW_ROWS.length} rows</span>
                    </div>
                    <div className="rl-tier-rows">
                      {RAW_ROWS.map((r, i) => (
                        <div
                          key={r.ts}
                          className={[
                            "rl-row",
                            selectedRange?.tier === "raw" ? "rl-row-active" : "",
                            phase === "rollup1" || phase === "rollup5"
                              ? `rl-group-${Math.floor(i / 4)}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="rl-row-ts">{r.ts}</span>
                          <span className="rl-row-val">{fmt2(r.value)}</span>
                        </div>
                      ))}
                    </div>
                    {phase === "raw" && (
                      <div className="rl-tier-action">
                        <button
                          className="concept-btn accent"
                          onClick={() => { setPhase("rollup1"); setSelectedRange(null); }}
                        >
                          Create 1-min Rollup
                        </button>
                      </div>
                    )}
                  </div>

                  {(phase === "rollup1" || phase === "rollup5") && (
                    <div className="rl-tier">
                      <div className="rl-tier-head">
                        <span className="rl-tier-name">1-min Rollup</span>
                        <span className="rl-tier-res">1-minute buckets</span>
                        <span className="rl-tier-count">{ROLLUP1.length} rows</span>
                      </div>
                      <div className="rl-tier-rows">
                        {ROLLUP1.map((r) => (
                          <div
                            key={r.bucket}
                            className={[
                              "rl-row rl-row-rollup",
                              selectedRange?.tier === "1min" ? "rl-row-active" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span className="rl-row-ts">{r.bucket}</span>
                            <span className="rl-row-agg">
                              avg={fmt2(r.avg)} min={fmt2(r.min)} max={fmt2(r.max)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {phase === "rollup1" && (
                        <div className="rl-tier-action">
                          <button
                            className="concept-btn accent"
                            onClick={() => { setPhase("rollup5"); setSelectedRange(null); }}
                          >
                            Create 5-min Rollup
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {phase === "rollup5" && (
                    <div className="rl-tier">
                      <div className="rl-tier-head">
                        <span className="rl-tier-name">5-min Rollup</span>
                        <span className="rl-tier-res">5-minute buckets</span>
                        <span className="rl-tier-count">{ROLLUP5.length} row</span>
                      </div>
                      <div className="rl-tier-rows">
                        {ROLLUP5.map((r) => (
                          <div
                            key={r.bucket}
                            className={[
                              "rl-row rl-row-rollup rl-row-rollup5",
                              selectedRange?.tier === "5min" ? "rl-row-active" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span className="rl-row-ts">{r.bucket}</span>
                            <span className="rl-row-agg">
                              avg={fmt2(r.avg)} min={fmt2(r.min)} max={fmt2(r.max)} count={r.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {phase === "rollup5" && (
                <div className="rl-query-section">
                  <div className="rl-query-label">
                    Which tier gets used for a query? Pick a time range:
                  </div>
                  <div className="rl-range-btns">
                    {RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        className={`rl-range-btn${selectedRange?.label === opt.label ? " active" : ""}`}
                        onClick={() => setSelectedRange(opt)}
                      >
                        <span className="rl-range-label">{opt.label}</span>
                        <span className="rl-range-desc">{opt.description}</span>
                      </button>
                    ))}
                  </div>

                  {selectedRange && (
                    <div className="rl-result-box">
                      <div className="rl-result-tier">
                        Using:{" "}
                        <strong>
                          {selectedRange.tier === "raw"
                            ? "Raw (15s)"
                            : selectedRange.tier === "1min"
                              ? "1-min rollup"
                              : "5-min rollup"}
                        </strong>
                      </div>
                      <div className="rl-result-reason">{selectedRange.reason}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="rl-sql-section">
                <div className="rl-sql-label">SQL reference</div>
                <pre className="rl-sql-block">{rollupSQL()}</pre>
              </div>

              {phase !== "idle" && (
                <div className="step-controls" style={{ marginTop: 16 }}>
                  <button
                    className="concept-btn"
                    onClick={() => { setPhase("idle"); setSelectedRange(null); }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="concept-sidebar">
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What is a Rollup?</div>
            <p>
              A rollup is a pre-computed summary of raw data at a lower resolution. Instead of storing
              every 15-second sample, you compute and store the average, min, and max per minute. A query
              for "last hour" reads 60 rollup rows instead of 240 raw rows, same answer, far less I/O.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Why tiered retention?</div>
            <p>
              Raw data is expensive to store forever. A typical policy:
            </p>
            <ul className="concept-tips">
              <li>Keep raw data for 7 days</li>
              <li>Keep 1-minute rollups for 30 days</li>
              <li>Keep 5-minute rollups for 1 year</li>
            </ul>
            <p style={{ marginTop: 6 }}>
              Older queries automatically use a lower-resolution tier, saving storage and speeding up reads.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">How does the database pick a tier?</div>
            <p>
              The query planner checks the time range of the query. If the range spans more than, say, 5 minutes,
              and a rollup tier covers that range, the planner rewrites the query to scan the rollup table instead
              of the raw table. This is sometimes called <strong>continuous aggregation</strong> or a
              <strong> materialized view</strong> in relational databases.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What is a Materialized View?</div>
            <p>
              In relational databases, a materialized view is a query result stored as a real table. Unlike
              a regular view (which re-runs the query on every read), a materialized view is refreshed on a
              schedule or on each write. Rollup tables are essentially materialized views over time windows.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Trade-off: freshness vs speed</div>
            <p>
              Rollups are pre-computed, so they can be slightly out of date (the last minute may not be
              aggregated yet). For dashboards and analytics, this is usually acceptable. For real-time alerting,
              you query the raw tier even though it is more expensive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
