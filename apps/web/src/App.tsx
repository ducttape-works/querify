import { useEffect, useRef, useState } from "react";
import "./App.css";

import type { Engine } from "./types/api";
import { fetchEngines } from "./services/api";

const SCHEMA_TABLES = ["users", "orders", "products", "reviews", "categories"];

export default function App() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [activeEngine, setActiveEngine] = useState<Engine | null>(null);

  useEffect(() => {
    fetchEngines().then((data) => {
      setEngines(data);
      setActiveEngine(data.find((e) => e.is_default) ?? data[0] ?? null);
    });
  }, []);

  return (
    <div className="layout">
      <Topbar engines={engines} active={activeEngine} onChange={setActiveEngine} />
      <div className="body">
        <Sidebar />
        <EditorPane />
        <OutputPane />
      </div>
    </div>
  );
}

function Topbar({
  engines,
  active,
  onChange,
}: {
  engines: Engine[];
  active: Engine | null;
  onChange: (e: Engine) => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo">Querify</span>

        <EnginePicker engines={engines} active={active} onChange={onChange} />

        <div className="badge badge-muted">
          interview-prep
          <span className="chevron">▾</span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="run-btn">
          Run <kbd>⌘↵</kbd>
        </button>
      </div>
    </header>
  );
}

function EnginePicker({
  engines,
  active,
  onChange,
}: {
  engines: Engine[];
  active: Engine | null;
  onChange: (e: Engine) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="engine-picker" ref={ref}>
      <button className="badge" onClick={() => setOpen((v) => !v)}>
        <span className="engine-dot" style={{ background: active?.color ?? "#aaa" }} />
        <span>{active?.name ?? "loading..."}</span>
        <span className="chevron" style={{ rotate: open ? "180deg" : "0deg" }}>▾</span>
      </button>

      {open && (
        <div className="engine-dropdown">
          {engines.map((eng) => (
            <button
              key={eng.name}
              className={`engine-option${eng.name === active?.name ? " selected" : ""}`}
              onClick={() => { onChange(eng); setOpen(false); }}
            >
              <span className="engine-dot" style={{ background: eng.color }} />
              {eng.name}
              {eng.name === active?.name && <span className="engine-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">Schema</div>
      <ul className="table-list">
        {SCHEMA_TABLES.map((table) => (
          <li key={table} className="table-item">
            <span className="table-icon">▤</span>
            {table}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EditorPane() {
  return (
    <div className="editor-pane">
      <div className="pane-header">
        <span className="pane-tab active">query.sql</span>
      </div>
      <div className="editor-area">
        <pre>{`-- Monaco editor loads here\nSELECT * FROM users LIMIT 10;`}</pre>
      </div>
    </div>
  );
}

function OutputPane() {
  return (
    <div className="output-pane">
      <div className="pane-header">
        <span className="pane-tab active">Results</span>
        <span className="pane-tab inactive">Visualizer</span>
        <span className="pane-tab inactive">Concepts</span>
      </div>
      <div className="empty-output">
        <span>Run a query to see results</span>
      </div>
    </div>
  );
}
