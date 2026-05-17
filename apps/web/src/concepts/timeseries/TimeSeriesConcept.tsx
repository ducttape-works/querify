import { useEffect, useMemo, useRef, useState } from "react";
import "../btree/btree.css";
import "./timeseries.css";

type TSTab = "datamodel" | "storage";
type TimeSeriesDimension = {
  name: string;
  values: string[];
  count: number;
  color: string;
  high?: boolean;
};

function renderText(text: string): React.ReactNode[] {
  return text.split(/`([^`]+)`/).map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : part,
  );
}

function IntroCard({ what, why }: { what: string; why: string }) {
  return (
    <div className="ts2-intro-card">
      <div className="ts2-intro-row">
        <span className="ts2-intro-lbl">What</span>
        <span className="ts2-intro-text">{what}</span>
      </div>
      <div className="ts2-intro-divider" />
      <div className="ts2-intro-row">
        <span className="ts2-intro-lbl">Why</span>
        <span className="ts2-intro-text">{why}</span>
      </div>
    </div>
  );
}

const DIMS: TimeSeriesDimension[] = [
  { name: "region",  values: ["us-east", "eu-west", "ap-south"],      count: 3,     color: "#3b82f6" },
  { name: "host",    values: ["web-01", "web-02", "web-03", "web-04"], count: 4,     color: "#10b981" },
  { name: "service", values: ["api", "auth", "worker", "cache"],       count: 5,     color: "#8b5cf6" },
  { name: "user_id", values: ["uid-0001", "uid-0002", "+9,998 more"],  count: 10000, color: "#ef4444", high: true },
];

const SAMPLE_TIMES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285];
const SAMPLE_VALS  = [42.1, 43.5, 41.8, 44.2, 40.9, 43.1, 42.7, 41.3, 44.8, 43.2, 42.5, 41.9, 43.7, 44.1, 42.3, 41.6, 43.9, 44.5, 42.8, 43.4];

function DataModelTab() {
  const [enabled, setEnabled] = useState<Set<number>>(new Set([0]));
  const [bucket, setBucket] = useState<"15s" | "1m" | "5m">("1m");

  const toggle = (i: number) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const total = [...enabled].reduce((acc, i) => acc * DIMS[i].count, 1);
  const isHigh = total > 500;

  const bSecs = bucket === "15s" ? 15 : bucket === "1m" ? 60 : 300;
  const numBuckets = Math.ceil((SAMPLE_TIMES[SAMPLE_TIMES.length - 1] + bSecs) / bSecs);

  const buckets = Array.from({ length: numBuckets }, (_, bi) => {
    const start = bi * bSecs;
    const items = SAMPLE_TIMES
      .map((t, i) => ({ t, v: SAMPLE_VALS[i] }))
      .filter(({ t }) => t >= start && t < start + bSecs);
    const avg = items.length
      ? +(items.reduce((s, { v }) => s + v, 0) / items.length).toFixed(1)
      : null;
    return { start, count: items.length, avg };
  }).filter((b) => b.count > 0);

  const maxAvg = Math.max(...buckets.map((b) => b.avg ?? 0));
  const minAvg = Math.min(...buckets.map((b) => b.avg ?? 99));
  const spread = maxAvg - minAvg || 1;

  return (
    <div className="ts2-section">
      <IntroCard
        what="A time-series database records every measurement over time. Unlike a regular database that stores only the latest state of a record, a TSDB keeps every reading — the history itself is the data."
        why="You can ask questions like 'what was CPU usage last Tuesday at 3am?' or 'show me the 99th percentile over the last 30 days' — impossible with a database that only stores the current value."
      />

      <div className="ts2-sample-card">
        <div className="ts2-sample-title">Every measurement is stored as a sample — a single data point</div>
        <div className="ts2-sample-json">
          <div className="ts2-json-line"><span className="ts2-json-brace">{"{"}</span></div>
          {[
            { key: '"timestamp"', val: '"2024-01-01T00:00:00Z"', cls: "ts2-json-ts",     note: "when the measurement was taken" },
            { key: '"metric"',    val: '"cpu_usage"',             cls: "ts2-json-metric", note: "what is being measured" },
            { key: '"value"',     val: "42.1",                    cls: "ts2-json-value",  note: "the actual measurement (a number)" },
          ].map(({ key, val, cls, note }) => (
            <div key={key} className="ts2-json-line ts2-json-indent">
              <span className="ts2-json-key">{key}</span>
              <span className="ts2-json-colon">: </span>
              <span className={`ts2-json-val ${cls}`}>{val}</span>
              <span className="ts2-json-note">{note}</span>
            </div>
          ))}
          <div className="ts2-json-line ts2-json-indent">
            <span className="ts2-json-key">"tags"</span>
            <span className="ts2-json-colon">: </span>
            <span className="ts2-json-brace">{"{"}</span>
            <span className="ts2-json-note">labels describing where/who — used for filtering and grouping</span>
          </div>
          <div className="ts2-json-line ts2-json-indent2">
            <span className="ts2-json-key">"host"</span>
            <span className="ts2-json-colon">: </span>
            <span className="ts2-json-val ts2-json-tag">"web-01"</span>
          </div>
          <div className="ts2-json-line ts2-json-indent2">
            <span className="ts2-json-key">"region"</span>
            <span className="ts2-json-colon">: </span>
            <span className="ts2-json-val ts2-json-tag">"us-east"</span>
          </div>
          <div className="ts2-json-line ts2-json-indent"><span className="ts2-json-brace">{"}"}</span></div>
          <div className="ts2-json-line"><span className="ts2-json-brace">{"}"}</span></div>
        </div>
      </div>

      <div className="ts2-window-section">
        <div className="ts2-window-header">
          <div>
            <div className="ts2-window-title">Time windows — grouping samples into buckets</div>
            <div className="ts2-window-subtitle">
              Raw samples arrive every 15s. Queries group them: "give me 1 average per minute" instead of 4 raw points.
            </div>
          </div>
          <div className="ts2-mode-picker">
            {(["15s", "1m", "5m"] as const).map((b) => (
              <button key={b} className={`ts2-mode-btn${bucket === b ? " on" : ""}`} onClick={() => setBucket(b)}>
                {b} bucket
              </button>
            ))}
          </div>
        </div>
        <div className="ts2-window-chart">
          {buckets.map((b, i) => {
            const pct = b.avg !== null ? Math.max(15, ((b.avg - minAvg) / spread) * 70 + 15) : 15;
            return (
              <div key={i} className="ts2-window-col">
                <div className="ts2-window-bar-wrap">
                  <div className="ts2-window-bar" style={{ height: `${pct}%` }} />
                </div>
                <div className="ts2-window-count">{b.count} {b.count === 1 ? "pt" : "pts"}</div>
                <div className="ts2-window-label">{b.start}s</div>
              </div>
            );
          })}
        </div>
        <div className="ts2-window-hint">
          {SAMPLE_TIMES.length} raw samples → {buckets.length} {bucket} bucket{buckets.length !== 1 ? "s" : ""}
          {bucket !== "15s" ? ` · ~${Math.round(SAMPLE_TIMES.length / buckets.length)} samples averaged per bucket` : " · no merging"}
        </div>
      </div>

      <div className="ts2-card-label">Cardinality — how many unique time series exist</div>
      <div className="ts2-card-sublabel">
        Each unique combination of metric + tags = 1 time series. Toggle dimensions to see how the total grows.
      </div>

      <div className="ts2-metric-label">
        <span className="ts2-metric-name">cpu_usage</span>
        <span className="ts2-metric-brace">{"{"}</span>
        {[...enabled].map((i, idx) => (
          <span key={i}>
            {idx > 0 && <span className="ts2-metric-comma">, </span>}
            <span className="ts2-metric-key" style={{ color: DIMS[i].color }}>{DIMS[i].name}</span>
            <span className="ts2-metric-eq">="…"</span>
          </span>
        ))}
        {enabled.size === 0 && <span className="ts2-metric-muted">no tags</span>}
        <span className="ts2-metric-brace">{"}"}</span>
      </div>

      <div className="ts2-dims-grid">
        {DIMS.map((dim, i) => {
          const on = enabled.has(i);
          return (
            <button
              key={dim.name}
              className={`ts2-dim-btn${on ? " on" : ""}${dim.high ? " danger" : ""}`}
              style={on ? ({ "--dim-color": dim.color } as React.CSSProperties) : undefined}
              onClick={() => toggle(i)}
            >
              <div className="ts2-dim-name">{dim.name}</div>
              <div className="ts2-dim-count">
                {dim.count >= 10000 ? `${dim.count.toLocaleString()}+ unique values` : `${dim.count} unique values`}
              </div>
              {dim.high && <div className="ts2-dim-warn">⚠ unbounded — grows forever</div>}
            </button>
          );
        })}
      </div>

      <div className="ts2-formula-wrap">
        <div className="ts2-formula-label">Unique series = multiply the value count of each active dimension:</div>
        <div className="ts2-formula-expr">
          {enabled.size === 0 ? (
            <span className="ts2-formula-n" style={{ color: "#44403c" }}>1</span>
          ) : (
            [...enabled].map((i, idx) => (
              <span key={i}>
                {idx > 0 && <span className="ts2-formula-op"> × </span>}
                <span className="ts2-formula-n" style={{ color: DIMS[i].color }}>{DIMS[i].count.toLocaleString()}</span>
                <span className="ts2-formula-tag"> ({DIMS[i].name})</span>
              </span>
            ))
          )}
          <span className="ts2-formula-op"> = </span>
          <span className={`ts2-formula-total${isHigh ? " high" : ""}`}>{total.toLocaleString()}</span>
          <span className="ts2-formula-tag"> series</span>
        </div>
        {isHigh && (
          <div className="ts2-warn-box">
            ⚠ High cardinality — {total.toLocaleString()} separate series means {total.toLocaleString()} index entries and memory chunks. Never use values that grow without bound (user IDs, request IDs) as tags.
          </div>
        )}
      </div>

      {[...enabled].map((i) => (
        <div key={DIMS[i].name} className="ts2-dim-row">
          <span className="ts2-dim-row-label" style={{ color: DIMS[i].color }}>{DIMS[i].name}</span>
          <div className="ts2-dim-chips">
            {DIMS[i].values.map((v) => <span key={v} className="ts2-dim-chip">{v}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

const METRIC_ROWS: Record<string, string>[] = [
  { ts: "00:00:00", value: "42.1", host: "web-01", region: "us-east" },
  { ts: "00:00:15", value: "43.5", host: "web-01", region: "us-east" },
  { ts: "00:00:30", value: "41.8", host: "web-01", region: "us-east" },
  { ts: "00:00:45", value: "44.2", host: "web-01", region: "us-east" },
  { ts: "00:01:00", value: "40.9", host: "web-01", region: "us-east" },
];
const METRIC_COLS = ["ts", "value", "host", "region"];

const LOG_ROWS: Record<string, string>[] = [
  { ts: "00:00:01", level: "info",  message: "request started",  host: "web-01" },
  { ts: "00:00:02", level: "error", message: "db timeout",       host: "web-02" },
  { ts: "00:00:03", level: "info",  message: "response 200 OK",  host: "web-01" },
  { ts: "00:00:04", level: "error", message: "conn refused",     host: "web-03" },
  { ts: "00:00:05", level: "info",  message: "healthcheck pass", host: "web-02" },
];
const LOG_COLS = ["ts", "level", "message", "host"];

type ScanStep = {
  activeRow: number; fetchRow: number; matchedRows: number[];
  phase: "scan" | "fetch" | "done"; bytesRead: number; message: string;
};

function buildMetricRowSteps(): ScanStep[] {
  const steps: ScanStep[] = [];
  for (let r = 0; r < METRIC_ROWS.length; r++) {
    steps.push({ activeRow: r, fetchRow: -1, matchedRows: [], phase: "scan", bytesRead: (r + 1) * METRIC_COLS.length * 8, message: `Reading row ${r + 1}: loads ts + value + host + region from disk — but only value is needed. 3 columns wasted.` });
  }
  steps.push({ activeRow: -1, fetchRow: -1, matchedRows: [], phase: "done", bytesRead: METRIC_ROWS.length * METRIC_COLS.length * 8, message: `Done. Read ${METRIC_ROWS.length * METRIC_COLS.length * 8}B — but only ${METRIC_ROWS.length * 8}B was actually needed. Row store read ${METRIC_COLS.length}× too much.` });
  return steps;
}

function buildMetricColSteps(): ScanStep[] {
  const steps: ScanStep[] = [];
  for (let r = 0; r < METRIC_ROWS.length; r++) {
    steps.push({ activeRow: r, fetchRow: -1, matchedRows: [], phase: "scan", bytesRead: (r + 1) * 8, message: `Reading value[${r + 1}] = ${METRIC_ROWS[r].value}. The ts, host, region columns are stored separately on disk — not opened.` });
  }
  steps.push({ activeRow: -1, fetchRow: -1, matchedRows: [], phase: "done", bytesRead: METRIC_ROWS.length * 8, message: `Done. Read only ${METRIC_ROWS.length * 8}B — exactly what was needed. ${METRIC_COLS.length}× less I/O than the row store.` });
  return steps;
}

function buildLogRowSteps(): ScanStep[] {
  const steps: ScanStep[] = [];
  const matched: number[] = [];
  for (let r = 0; r < LOG_ROWS.length; r++) {
    const isMatch = LOG_ROWS[r].level === "error";
    if (isMatch) matched.push(r);
    steps.push({ activeRow: r, fetchRow: -1, matchedRows: [...matched], phase: "scan", bytesRead: (r + 1) * LOG_COLS.length * 8, message: isMatch ? `Row ${r + 1}: level = "error" — match! But we still had to read the full row to check.` : `Row ${r + 1}: level = "${LOG_ROWS[r].level}" — no match. Full row loaded just to discard it.` });
  }
  steps.push({ activeRow: -1, fetchRow: -1, matchedRows: [...matched], phase: "done", bytesRead: LOG_ROWS.length * LOG_COLS.length * 8, message: `Done. Read all ${LOG_ROWS.length * LOG_COLS.length * 8}B to find ${matched.length} errors. Every non-matching message column was loaded for nothing.` });
  return steps;
}

function buildLogColSteps(): ScanStep[] {
  const steps: ScanStep[] = [];
  const matched: number[] = [];
  for (let r = 0; r < LOG_ROWS.length; r++) {
    const isMatch = LOG_ROWS[r].level === "error";
    if (isMatch) matched.push(r);
    steps.push({ activeRow: r, fetchRow: -1, matchedRows: [...matched], phase: "scan", bytesRead: (r + 1) * 8, message: isMatch ? `level[${r + 1}] = "error" — match. Row marked for later fetch. ts and message not read yet.` : `level[${r + 1}] = "${LOG_ROWS[r].level}" — skip. ts and message never opened for this row.` });
  }
  for (let i = 0; i < matched.length; i++) {
    const r = matched[i];
    steps.push({ activeRow: -1, fetchRow: r, matchedRows: [...matched], phase: "fetch", bytesRead: LOG_ROWS.length * 8 + (i + 1) * 2 * 8, message: `Late fetch — reading ts and message for row ${r + 1}. Only matched rows pay this cost.` });
  }
  const totalBytes = LOG_ROWS.length * 8 + matched.length * 2 * 8;
  steps.push({ activeRow: -1, fetchRow: -1, matchedRows: [...matched], phase: "done", bytesRead: totalBytes, message: `Done. Scanned level (${LOG_ROWS.length * 8}B) + fetched ts+message for ${matched.length} rows (${matched.length * 16}B) = ${totalBytes}B total vs ${LOG_ROWS.length * LOG_COLS.length * 8}B row store.` });
  return steps;
}

function getCellCls(r: number, col: string, step: ScanStep | null, query: "avg" | "filter", mode: "row" | "col"): string {
  if (!step) return "";
  const { activeRow, fetchRow, matchedRows, phase } = step;
  const done = phase === "done";
  const isMatch = matchedRows.includes(r);
  if (mode === "row") {
    if (query === "avg") {
      if (activeRow === r) return col === "value" ? "ts2-hl-match" : "ts2-hl-skip";
      if (activeRow > r || done) return col === "value" ? "ts2-hl-done-good" : "";
    } else {
      if (activeRow === r) {
        if (col === "level") return isMatch ? "ts2-hl-match" : "ts2-hl-active";
        if (col === "ts" || col === "message") return isMatch ? "ts2-hl-match" : "ts2-hl-skip";
        return "ts2-hl-skip";
      }
      if (activeRow > r || done) {
        if (isMatch && (col === "ts" || col === "message")) return "ts2-hl-done-good";
        return "";
      }
    }
  } else {
    if (query === "avg") {
      if (col !== "value") return "ts2-td-dim";
      if (activeRow === r) return "ts2-hl-match";
      if (activeRow > r || done) return "ts2-hl-done-good";
    } else {
      if (phase === "scan") {
        if (col !== "level") return "ts2-td-dim";
        if (activeRow === r) return isMatch ? "ts2-hl-match" : "ts2-hl-active";
        if (activeRow > r) return isMatch ? "ts2-hl-done-good" : "";
      } else {
        if (col === "level") return isMatch ? "ts2-hl-done-good" : "";
        if (col === "host") return "ts2-td-dim";
        if (!isMatch) return "ts2-td-dim";
        if (fetchRow === r) return "ts2-hl-match";
        const fi = matchedRows.indexOf(r);
        const ai = matchedRows.indexOf(fetchRow === -1 ? -999 : fetchRow);
        if (done || (ai !== -1 && fi < ai)) return "ts2-hl-done-good";
      }
    }
  }
  return "";
}

function StorageTab() {
  const [query, setQuery] = useState<"avg" | "filter">("avg");
  const [mode, setMode] = useState<"row" | "col">("row");
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = useMemo(() => {
    if (query === "avg") return mode === "row" ? buildMetricRowSteps() : buildMetricColSteps();
    return mode === "row" ? buildLogRowSteps() : buildLogColSteps();
  }, [query, mode]);

  useEffect(() => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setStepIdx(-1);
    const t = setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(t);
  }, [query, mode]);

  useEffect(() => {
    if (!playing || !steps.length) return;
    if (stepIdx >= steps.length - 1) { const t = setTimeout(() => setPlaying(false), 0); return () => clearTimeout(t); }
    playTimer.current = setTimeout(() => setStepIdx((i) => i + 1), 580);
    return () => { if (playTimer.current) clearTimeout(playTimer.current); };
  }, [playing, stepIdx, steps]);

  const current = stepIdx >= 0 ? steps[stepIdx] : null;
  const rows = query === "avg" ? METRIC_ROWS : LOG_ROWS;
  const cols = query === "avg" ? METRIC_COLS : LOG_COLS;
  const maxBytes = rows.length * cols.length * 8;
  const thCls = (col: string) => query === "avg" ? (col === "value" ? " target" : "") : col === "level" ? " filter-key" : col === "ts" || col === "message" ? " result-col" : "";
  const sqlLabel = query === "avg" ? "SELECT AVG(value) FROM cpu_usage" : "SELECT ts, message FROM logs WHERE level = 'error'";
  const msgType = current?.phase === "done" ? "found" : current?.phase === "fetch" ? "write" : "traverse";

  return (
    <div className="ts2-section">
      <IntroCard
        what="Databases physically store data in one of two layouts: row-oriented (all columns of a row stored together) or column-oriented (all values of one column stored together)."
        why="Time-series queries almost always read one column (the value) across millions of rows. A column store reads only the column you asked for — a row store reads every column even when you only need one."
      />
      <div className="ts2-storage-pickers">
        <div>
          <div className="ts2-picker-label">Query to run:</div>
          <div className="ts2-mode-picker">
            <button className={`ts2-mode-btn${query === "avg" ? " on" : ""}`} onClick={() => setQuery("avg")}>AVG over all rows</button>
            <button className={`ts2-mode-btn${query === "filter" ? " on" : ""}`} onClick={() => setQuery("filter")}>Filter by column value</button>
          </div>
        </div>
        <div>
          <div className="ts2-picker-label">Storage layout:</div>
          <div className="ts2-mode-picker">
            <button className={`ts2-mode-btn${mode === "row" ? " on" : ""}`} onClick={() => setMode("row")}>Row store</button>
            <button className={`ts2-mode-btn${mode === "col" ? " on" : ""}`} onClick={() => setMode("col")}>Column store</button>
          </div>
        </div>
      </div>
      <div className="ts2-layout-legend">
        {mode === "row"
          ? <span className="ts2-legend-row">Row store — each row stored together. Reading any column means loading the whole row.</span>
          : <span className="ts2-legend-col">Column store — each column stored together. Reading one column never touches the others.</span>}
      </div>
      <code className="ts2-query-badge">{sqlLabel}</code>
      {mode === "col" && query === "filter" && (
        <div className="ts2-phase-strip">
          <span className={`ts2-phase-badge${current?.phase === "scan" ? " active" : current?.phase === "fetch" || current?.phase === "done" ? " done" : ""}`}>Phase 1 — scan the filter column only</span>
          <span className="ts2-phase-arrow">→</span>
          <span className={`ts2-phase-badge${current?.phase === "fetch" ? " active" : current?.phase === "done" ? " done" : ""}`}>Phase 2 — fetch other columns for matched rows only</span>
        </div>
      )}
      <div className="ts2-table-wrap">
        <table className="ts2-table">
          <thead><tr>{cols.map((col) => <th key={col} className={`ts2-th${thCls(col)}`}>{col}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>{cols.map((col) => <td key={col} className={`ts2-td ${getCellCls(r, col, current, query, mode)}`}>{row[col]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ts2-io-meter">
        <span className="ts2-io-label">Data read from disk:</span>
        <div className="ts2-io-bar-wrap">
          <div className={`ts2-io-bar ${mode}`} style={{ width: `${Math.max(0, ((current?.bytesRead ?? 0) / maxBytes) * 100)}%` }} />
        </div>
        <span className="ts2-io-count">{current?.bytesRead ?? 0}B / {maxBytes}B max</span>
      </div>
      <div className="step-controls">
        <button className="step-btn" onClick={() => { setPlaying(false); setStepIdx(0); }}>⏮</button>
        <button className="step-btn" onClick={() => { setPlaying(false); setStepIdx((i) => Math.max(0, i - 1)); }}>‹</button>
        <span className="step-counter">{stepIdx >= 0 ? `${stepIdx + 1} / ${steps.length}` : `– / ${steps.length}`}</span>
        <button className="step-btn" onClick={() => { setPlaying(false); setStepIdx((i) => Math.min(steps.length - 1, i + 1)); }}>›</button>
        <button className="step-btn" onClick={() => { setPlaying(false); setStepIdx(steps.length - 1); }}>⏭</button>
        <button className="step-btn play" onClick={() => { if (stepIdx < 0) setStepIdx(0); setPlaying((p) => !p); }}>{playing ? "⏸" : "⏵"}</button>
      </div>
      <div className="concept-message" data-type={msgType}>
        {current?.message ?? "Press ▶ to step through the query and watch which cells are read from disk."}
      </div>
    </div>
  );
}

const SIDEBAR: Record<TSTab, { label: string; body: string }[]> = {
  datamodel: [
    { label: "What is a time-series database?", body: "A normal database stores the current state of things. A time-series database stores every historical measurement. Every reading is kept — the entire history is queryable." },
    { label: "What is a sample?", body: "One data point: a timestamp (when), a metric name (what you measured), a numeric value (the measurement), and tags (labels that describe where or who). Think of it like a log entry with a value attached." },
    { label: "What are tags, and why do they matter?", body: "Tags are key-value labels attached to each sample — like `host=web-01` or `region=us-east`. They let you filter and group data. `cpu_usage{host=web-01}` is a different series than `cpu_usage{host=web-02}`." },
    { label: "What is cardinality?", body: "The total number of unique time series in your database. One series per unique tag combination. 3 regions × 4 hosts = 12 series. Add a `user_id` tag with 100,000 users and you have 1.2 million series — a cardinality explosion." },
    { label: "What is a time window?", body: "`GROUP BY time(1m)` splits the timeline into 1-minute buckets. All samples inside each bucket are collapsed into one value (AVG, SUM, MAX). Dashboards use this — you don't need 4 raw points per second on a 7-day chart." },
  ],
  storage: [
    { label: "What is a row store?", body: "Saves all columns of a row next to each other on disk: (ts, value, host, region) all in one block. Great for 'give me all the data for row #42'. Inefficient for 'give me only the value column for all 10 million rows'." },
    { label: "What is a column store?", body: "Saves all values of one column next to each other: all timestamps together, all values together. Reading just the value column means reading a dense block of numbers — nothing else loaded from disk." },
    { label: "Why does this matter for time-series data?", body: "`SELECT AVG(value)` only needs the value column. In a column store, this reads exactly those values — no timestamps, no host names. For millions of rows, this can be 4–10× less I/O than a row store." },
    { label: "What is late materialization?", body: "When filtering (WHERE level = 'error'), a column store first scans only the filter column to find matching row numbers. Then it fetches the other columns only for those matching rows. Rows that don't match never have their columns loaded." },
  ],
};

const TAB_LABELS: Record<TSTab, string> = { datamodel: "Data Model", storage: "Columnar Storage" };

export function TimeSeriesConcept() {
  const [tab, setTab] = useState<TSTab>("datamodel");
  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual">
            <div className="ts2-wrap">
              <div className="ts2-tabs">
                {(Object.keys(TAB_LABELS) as TSTab[]).map((t) => (
                  <button key={t} className={`ts2-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
              {tab === "datamodel" && <DataModelTab />}
              {tab === "storage"   && <StorageTab />}
            </div>
          </div>
        </div>
        <aside className="concept-sidebar">
          {SIDEBAR[tab].map(({ label, body }) => (
            <div key={label} className="concept-sidebar-section">
              <div className="concept-sidebar-label">{label}</div>
              <p>{renderText(body)}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
