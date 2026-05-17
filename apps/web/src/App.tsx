import Editor, { type Monaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type { Database } from "sql.js";
import "./App.css";
import { BTreeConcept } from "./concepts/btree/BTreeConcept";
import { IndexesConcept } from "./concepts/indexes/IndexesConcept";
import { LSMConcept } from "./concepts/lsm/LSMConcept";
import { RollupsConcept } from "./concepts/rollups/RollupsConcept";
import { ShardingConcept } from "./concepts/sharding/ShardingConcept";
import { TimeSeriesConcept } from "./concepts/timeseries/TimeSeriesConcept";
import { WritePathConcept } from "./concepts/writepath/WritePathConcept";

import {
  createSession,
  deleteSession,
  executeSessionQuery,
  fetchEngines,
  fetchSessionSchema,
  getSessionEventsUrl,
} from "./services/api";
import {
  getPersistedEngineName,
  getPersistedQuery,
  persistEngineName,
  persistQuery,
} from "./services/persistence";
import { createSqliteDb, formatCell, getTables } from "./services/sqlite";
import { queries } from "./sql/sqlite";
import type { Engine, SchemaTable, Session } from "./types/api";
import type { CellValue, QueryResultState } from "./types/sqlite";

export default function App() {
  const [view, setView] = useState<"playground" | "btree" | "indexes" | "lsm" | "timeseries" | "writepath" | "sharding" | "rollups">("playground");
  const [engines, setEngines] = useState<Engine[]>([]);
  const [activeEngine, setActiveEngine] = useState<Engine | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState<string>(
    () => getPersistedQuery() ?? queries.default,
  );
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [db, setDb] = useState<Database | null>(null);
  const [result, setResult] = useState<QueryResultState | null>(null);
  const [error, setError] = useState("");
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingEngines, setLoadingEngines] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [runningQuery, setRunningQuery] = useState(false);
  const sessionRequestId = useRef(0);
  const runQueryRef = useRef<() => void>(() => {});

  const selectEngine = (engine: Engine | null) => {
    const previousSession = session;
    const previousEngine = activeEngine;
    sessionRequestId.current += 1;
    const requestId = sessionRequestId.current;

    setActiveEngine(engine);
    setSession(null);
    setError("");
    setResult(null);
    setTables(engine?.name === "sqlite" && db ? getTables(db) : []);
    setExpandedTables(new Set());

    if (!engine) {
      setLoadingSession(false);
      return;
    }

    if (
      previousSession &&
      previousEngine &&
      previousEngine.name !== "sqlite" &&
      previousSession.status !== "stopped"
    ) {
      void deleteSession(previousSession.id);
    }

    persistEngineName(engine.name);

    if (engine.name === "sqlite") {
      setLoadingSession(false);
      return;
    }

    setLoadingSession(true);

    createSession(engine.name)
      .then((nextSession) => {
        if (sessionRequestId.current !== requestId) return;
        setSession(nextSession);
      })
      .catch((err) => {
        if (sessionRequestId.current !== requestId) return;
        setSession(null);
        setError(err instanceof Error ? err.message : "Failed to create session");
      })
      .finally(() => {
        if (sessionRequestId.current !== requestId) return;
        setLoadingSession(false);
      });
  };

  useEffect(() => {
    fetchEngines()
      .then(({ engines }) => {
        setEngines(engines);
        const persistedEngineName = getPersistedEngineName();
        const initialEngine =
          engines.find((engine) => engine.name === persistedEngineName) ??
          engines.find((engine) => engine.is_default) ??
          engines[0] ??
          null;

        selectEngine(initialEngine);
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

  useEffect(() => {
    persistQuery(query);
  }, [query]);

  useEffect(() => {
    if (!session || session.status !== "spawning") return;

    const source = new EventSource(getSessionEventsUrl(session.id), {
      withCredentials: true,
    });

    source.addEventListener("session.ready", (event) => {
      const nextSession = JSON.parse((event as MessageEvent).data) as Session;
      setSession(nextSession);
      source.close();
    });

    source.addEventListener("session.error", (event) => {
      const nextSession = JSON.parse((event as MessageEvent).data) as Session;
      setSession(nextSession);
      setError(nextSession.message ?? "Sandbox session failed to start.");
      source.close();
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [session]);

  useEffect(() => {
    if (
      !activeEngine ||
      activeEngine.name === "sqlite" ||
      !session ||
      session.status !== "ready"
    ) {
      return;
    }

    fetchSessionSchema(session.id)
      .then((schema) => {
        setTables(schema.tables);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load schema");
      });
  }, [activeEngine, session]);

  const runQuery = () => {
    if (!activeEngine) return;

    if (activeEngine.name !== "sqlite") {
      if (!session || session.status !== "ready") return;

      setError("");
      setRunningQuery(true);

      const isDDL = activeEngine.name === "mongodb"
        ? /createCollection|\.drop\(\)|dropCollection|insertOne|insertMany/i.test(query)
        : /^\s*(create|drop|alter|rename|truncate)\b/i.test(query);

      executeSessionQuery(session.id, query)
        .then((nextResult) => {
          setResult(nextResult);
          if (isDDL) {
            fetchSessionSchema(session.id)
              .then((schema) => setTables(schema.tables))
              .catch(() => {});
          }
        })
        .catch((err) => {
          setResult(null);
          setError(err instanceof Error ? err.message : "Query failed");
        })
        .finally(() => {
          setRunningQuery(false);
        });

      return;
    }

    if (!db) return;

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
  runQueryRef.current = runQuery;

  const conceptViews = ["btree", "indexes", "lsm", "timeseries", "writepath", "sharding", "rollups"] as const;
  const isConceptView = (conceptViews as readonly string[]).includes(view);

  const conceptLinks = [
    { id: "btree", label: "B-Tree" },
    { id: "indexes", label: "Indexes" },
    { id: "lsm", label: "LSM Tree" },
    { id: "timeseries", label: "Time Series" },
    { id: "writepath", label: "Write Path" },
    { id: "sharding", label: "Sharding" },
    { id: "rollups", label: "Rollups" },
  ] as const;

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">Querify</span>
          <nav className="topbar-nav">
            <button
              className={`nav-link${view === "playground" ? " active" : ""}`}
              onClick={() => setView("playground")}
            >
              Playground
            </button>
            <span className="nav-sep" />
            <button
              className={`nav-link${isConceptView ? " active" : ""}`}
              onClick={() => setView("btree")}
            >
              Concepts
            </button>
          </nav>
          {view === "playground" && (
            <>
              <EnginePicker
                active={activeEngine}
                engines={engines}
                loading={loadingEngines}
                onChange={selectEngine}
              />
              <div className="badge badge-muted">
                {activeEngine?.name === "sqlite" ? "browser sqlite" : "remote sandbox"}
              </div>
            </>
          )}
        </div>

        <div className="topbar-right">
          <a
            href="https://github.com/ducttape-works/querify"
            target="_blank"
            rel="noreferrer"
            className="github-link"
          >
            ★ Star on GitHub
          </a>
          {view === "playground" && <button
            className="run-btn"
            disabled={
              loadingDb ||
              loadingEngines ||
              runningQuery ||
              (!activeEngine
                ? true
                : activeEngine.name === "sqlite"
                  ? false
                  : session?.status !== "ready")
            }
            onClick={runQuery}
          >
            Run <kbd>⌘↵</kbd>
          </button>}
        </div>
      </header>

      {isConceptView && (
        <nav className="concept-subnav">
          {conceptLinks.map(({ id, label }) => (
            <button
              key={id}
              className={`subnav-link${view === id ? " active" : ""}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className="body">
        {view === "btree" && <BTreeConcept />}
        {view === "indexes" && <IndexesConcept />}
        {view === "lsm" && <LSMConcept />}
        {view === "timeseries" && <TimeSeriesConcept />}
        {view === "writepath" && <WritePathConcept />}
        {view === "sharding" && <ShardingConcept />}
        {view === "rollups" && <RollupsConcept />}
        {view === "playground" && <>
        <aside className="sidebar">
          <div className="sidebar-header">Schema</div>
          {tables.length > 0 ? (
            <ul className="table-list">
              {tables.map((table) => (
                <li key={table.name}>
                  <button
                    className="table-item"
                    onClick={() => {
                      setQuery(
                        activeEngine?.name === "mongodb"
                          ? `db.${table.name}.find({})`
                          : `SELECT * FROM ${table.name} LIMIT 100;`
                      );
                      setExpandedTables((prev) => {
                        const next = new Set(prev);
                        next.has(table.name) ? next.delete(table.name) : next.add(table.name);
                        return next;
                      });
                    }}
                    type="button"
                  >
                    <span className="table-icon">▤</span>
                    {table.name}
                    {table.columns.length > 0 && (
                      <span className="table-chevron">
                        {expandedTables.has(table.name) ? "▾" : "▸"}
                      </span>
                    )}
                  </button>
                  {expandedTables.has(table.name) && table.columns.length > 0 && (
                    <ul className="column-list">
                      {table.columns.map((col) => (
                        <li key={col.name} className="column-item">
                          <span className="column-name">{col.name}</span>
                          <span className="column-type">{col.type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : activeEngine?.name === "sqlite" ? (
            <div className="sidebar-empty">
              {loadingDb ? "Loading browser schema..." : "No tables found."}
            </div>
          ) : (
            <div className="sidebar-empty">
              {loadingSession || session?.status === "spawning"
                ? "Preparing remote schema..."
                : session?.status === "ready"
                  ? "No tables found."
                  : "Remote schema will show up here."}
            </div>
          )}
        </aside>

        <div className="editor-pane">
          <div className="pane-header">
            <span className="pane-tab active">{activeEngine?.name === "mongodb" ? "query.js" : "query.sql"}</span>
          </div>

          <div className="editor-area">
            <Editor
              height="100%"
              language={activeEngine?.name === "mongodb" ? "javascript" : "sql"}
              theme="querify-light"
              value={query}
              onChange={(val) => setQuery(val ?? "")}
              options={{
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
                folding: false,
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                glyphMargin: false,
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                fontLigatures: true,
                wordWrap: "on",
                tabSize: 2,
                scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                suggest: { showKeywords: true },
              }}
              beforeMount={(monaco: Monaco) => {
                monaco.editor.defineTheme("querify-light", {
                  base: "vs",
                  inherit: true,
                  rules: [
                    { token: "keyword", foreground: "2f8d6a", fontStyle: "bold" },
                    { token: "string", foreground: "8b5cf6" },
                    { token: "number", foreground: "c2410c" },
                    { token: "comment", foreground: "78716c", fontStyle: "italic" },
                    { token: "operator", foreground: "44403c" },
                  ],
                  colors: {
                    "editor.background": "#ffffff",
                    "editor.foreground": "#44403c",
                    "editor.lineHighlightBackground": "#f0eeeb00",
                    "editorLineNumber.foreground": "#c4bfba",
                    "editorLineNumber.activeForeground": "#78716c",
                    "editor.selectionBackground": "#d9f3ea",
                    "editorCursor.foreground": "#2f8d6a",
                    "editorIndentGuide.background1": "#e4e1db",
                    "editorBracketMatch.background": "#d9f3ea",
                    "editorBracketMatch.border": "#2f8d6a",
                  },
                });
              }}
              onMount={(editor, monaco) => {
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  () => runQueryRef.current(),
                );
              }}
            />

            <div className="editor-footer">
              <span>
                {activeEngine?.name === "sqlite"
                  ? loadingDb
                    ? "Loading SQLite..."
                    : "SQLite is ready."
                  : loadingSession
                    ? "Creating remote session..."
                    : runningQuery
                      ? "Running remote query..."
                    : session
                      ? `Session ${session.status}.`
                      : "Pick an engine to start a session."}
              </span>
              <span>
                {activeEngine?.name === "sqlite" || session?.status === "ready"
                  ? "Ctrl/Cmd + Enter to run."
                  : "Session will start when you pick an engine."}
              </span>
            </div>
          </div>
        </div>

        <div className="output-pane">
          <div className="pane-header">
            <span className="pane-tab active">Results</span>
          </div>

          {error && <div className="output-message error-message">{error}</div>}

          {!error && activeEngine?.name !== "sqlite" && !result && (
            <div className="output-message">
              {loadingSession && "Creating remote session..."}
              {!loadingSession && session?.status === "spawning" && "Preparing sandbox session..."}
              {!loadingSession && !runningQuery && session?.status === "ready" && !result && "Run a query to see results."}
              {!loadingSession && session?.status === "error" && "Sandbox session failed to start."}
              {!loadingSession && !session && "Remote session will appear here."}
            </div>
          )}

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
        </>}
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
