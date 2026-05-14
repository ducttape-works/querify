import { useEffect, useState } from "react";
import type { Database } from "sql.js";
import "./App.css";

import { fetchEngines } from "./services/api";
import { createSqliteDb, formatCell, getTables } from "./services/sqlite";
import { queries } from "./sql/sqlite";
import type { Engine } from "./types/api";
import type { CellValue, QueryResultState } from "./types/sqlite";

export default function App() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [activeEngine, setActiveEngine] = useState<Engine | null>(null);
  const [query, setQuery] = useState<string>(queries.default);
  const [tables, setTables] = useState<string[]>([]);
  const [db, setDb] = useState<Database | null>(null);
  const [result, setResult] = useState<QueryResultState | null>(null);
  const [error, setError] = useState("");
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingEngines, setLoadingEngines] = useState(true);

  useEffect(() => {
    fetchEngines()
      .then((data) => {
        setEngines(data);
        setActiveEngine(
          data.find((engine) => engine.is_default) ?? data[0] ?? null,
        );
      })
      .catch(() => {
        setError("Failed to load engines from the backend.");
      })
      .finally(() => {
        setLoadingEngines(false);
      });
  }, []);

  useEffect(() => {
    createSqliteDb()
      .then((nextDb) => {
        setDb(nextDb);
        setTables(getTables(nextDb));
      })
      .finally(() => {
        setLoadingDb(false);
      });
  }, []);

  const runQuery = () => {
    if (!db || activeEngine?.name !== "sqlite") return;

    setError("");

    try {
      const startedAt = performance.now();
      const rows = db.exec(query);
      const elapsedMs = performance.now() - startedAt;

      setTables(getTables(db));

      if (!rows.length) {
        setResult({
          columns: [],
          rows: [],
          message: "Query executed successfully",
          elapsedMs,
        });
        return;
      }

      const output = rows[rows.length - 1];

      setResult({
        columns: output.columns,
        rows: output.values as CellValue[][],
        message: `${output.values.length} row${output.values.length === 1 ? "" : "s"} returned`,
        elapsedMs,
      });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Query failed");
    }
  };

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">Querify</span>
          <EnginePicker
            active={activeEngine}
            engines={engines}
            loading={loadingEngines}
            onChange={(engine) => {
              setActiveEngine(engine);
              setError("");
              setResult(null);
            }}
          />
          <div className="badge badge-muted">browser sqlite</div>
        </div>

        <div className="topbar-right">
          <button
            className="run-btn"
            disabled={
              loadingDb || loadingEngines || activeEngine?.name !== "sqlite"
            }
            onClick={runQuery}
          >
            Run <kbd>⌘↵</kbd>
          </button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="sidebar-header">Schema</div>
          <ul className="table-list">
            {tables.map((table) => (
              <li key={table}>
                <button
                  className="table-item"
                  onClick={() =>
                    setQuery(`SELECT * FROM ${table} ORDER BY id;`)
                  }
                  type="button"
                >
                  <span className="table-icon">▤</span>
                  {table}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="editor-pane">
          <div className="pane-header">
            <span className="pane-tab active">query.sql</span>
          </div>

          <div className="editor-area">
            <textarea
              className="query-editor"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  runQuery();
                }
              }}
              spellCheck={false}
              value={query}
            />

            <div className="editor-footer">
              <span>
                {loadingDb ? "Loading SQLite..." : "SQLite is ready."}
              </span>
              <span>
                {activeEngine?.name === "sqlite"
                  ? "Ctrl/Cmd + Enter to run."
                  : "Only sqlite runs here for now."}
              </span>
            </div>
          </div>
        </div>

        <div className="output-pane">
          <div className="pane-header">
            <span className="pane-tab active">Results</span>
          </div>

          {activeEngine && activeEngine.name !== "sqlite" && (
            <div className="output-message">
              Only sqlite is wired up in the browser right now.
            </div>
          )}

          {error && <div className="output-message error-message">{error}</div>}

          {!error && activeEngine?.name === "sqlite" && !result && (
            <div className="empty-output">
              <span>
                {loadingDb
                  ? "Loading browser SQLite..."
                  : "Run a query to see results"}
              </span>
            </div>
          )}

          {!error && result && (
            <div className="result-panel">
              <div className="result-meta">
                <span>{result.message}</span>
                <span>{result.elapsedMs.toFixed(2)} ms</span>
              </div>

              {result.columns.length > 0 ? (
                <div className="result-table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {result.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`}>
                              {formatCell(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="output-message">{result.message}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EnginePicker({
  active,
  engines,
  loading,
  onChange,
}: {
  active: Engine | null;
  engines: Engine[];
  loading: boolean;
  onChange: (engine: Engine) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="engine-picker">
      <button
        className="badge"
        disabled={loading || !active}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span
          className="engine-dot"
          style={{ background: active?.color ?? "#999" }}
        />
        <span>{active?.name ?? "loading..."}</span>
        <span className="chevron" style={{ rotate: open ? "180deg" : "0deg" }}>
          ▾
        </span>
      </button>

      {open && active && (
        <div className="engine-dropdown">
          {engines.map((engine) => (
            <button
              key={engine.name}
              className={`engine-option${engine.name === active.name ? " selected" : ""}`}
              onClick={() => {
                onChange(engine);
                setOpen(false);
              }}
              type="button"
            >
              <span
                className="engine-dot"
                style={{ background: engine.color }}
              />
              {engine.name}
              {engine.name === active.name && (
                <span className="engine-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
