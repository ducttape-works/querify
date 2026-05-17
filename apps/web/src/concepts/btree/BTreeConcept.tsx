import { useEffect, useRef, useState } from "react";
import { BTree } from "../../lib/btree";
import type { BTreeNode, BTreeStep } from "../../lib/btree";
import type { Session } from "../../types/api";
import type { QueryResultState } from "../../types/sqlite";
import {
  createSession,
  executeSessionQuery,
  fetchBTreeConceptState,
  getSessionEventsUrl,
} from "../../services/api";
import { BTreeVisual } from "./BTreeVisual";
import "./btree.css";

const SEED_QUERIES = [
  "CREATE TABLE IF NOT EXISTS products (id INT PRIMARY KEY, name TEXT, price NUMERIC)",
  "INSERT INTO products VALUES (10,'Laptop',999),(15,'Mouse',29),(20,'Keyboard',79),(25,'Monitor',399),(30,'Headset',149),(40,'Webcam',89),(50,'Desk',299) ON CONFLICT DO NOTHING",
  "CREATE INDEX IF NOT EXISTS idx_products_id ON products(id)",
];

type Phase = "idle" | "spawning" | "seeding" | "ready" | "error";

function makeIdleStep(root: BTreeNode): BTreeStep {
  return {
    root,
    highlightNodeId: null,
    highlightKeyIdx: null,
    message:
      "Tree is up to date. Type a value and hit Insert or Search to see it in action.",
    type: "traverse",
  };
}

export function BTreeConcept() {
  const treeRef = useRef(new BTree(2));
  const [seedRoot, setSeedRoot] = useState<BTreeNode>(() => new BTree(2).root);
  const [steps, setSteps] = useState<BTreeStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animInput, setAnimInput] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("spawning");
  const [phaseMsg, setPhaseMsg] = useState("Starting Postgres sandbox...");
  const [query, setQuery] = useState("SELECT * FROM products;");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<QueryResultState | null>(null);
  const [queryError, setQueryError] = useState("");

  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const syncTree = async (sessionId: string) => {
    try {
      const state = await fetchBTreeConceptState(sessionId);
      const tree = new BTree(2);
      tree.seed(state.keys);
      treeRef.current = tree;
      setSeedRoot(structuredClone(tree.root));
      setSteps([]);
      setStepIdx(0);
      setPlaying(false);
    } catch {
      return;
    }
  };

  const seedDatabase = async (sessionId: string) => {
    setPhase("seeding");
    for (const q of SEED_QUERIES) {
      setPhaseMsg(q.slice(0, 48) + "...");
      await executeSessionQuery(sessionId, q);
    }
    await syncTree(sessionId);
    setPhaseMsg("");
    setPhase("ready");
  };

  useEffect(() => {
    let cancelled = false;

    createSession("postgresql")
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        sessionRef.current = s;

        if (s.status === "ready") {
          seedDatabase(s.id);
          return;
        }

        const source = new EventSource(getSessionEventsUrl(s.id), {
          withCredentials: true,
        });

        source.addEventListener("session.ready", (e) => {
          if (cancelled) return source.close();
          const ready = JSON.parse((e as MessageEvent).data) as Session;
          setSession(ready);
          sessionRef.current = ready;
          source.close();
          seedDatabase(ready.id);
        });

        source.addEventListener("session.error", (e) => {
          if (cancelled) return source.close();
          const failed = JSON.parse((e as MessageEvent).data) as Session;
          setSession(failed);
          setPhase("error");
          setPhaseMsg(failed.message ?? "Session failed to start.");
          source.close();
        });

        source.onerror = () => source.close();
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPhase("error");
        setPhaseMsg(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing || !steps.length) return;
    if (stepIdx >= steps.length - 1) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    playTimer.current = setTimeout(() => setStepIdx((i) => i + 1), 650);
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, [playing, stepIdx, steps]);

  const currentStep = steps.length ? steps[stepIdx] : makeIdleStep(seedRoot);

  const runSteps = (newSteps: BTreeStep[]) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setSteps(newSteps);
    setStepIdx(0);
    setPlaying(true);
  };

  const handleAnimInsert = () => {
    const val = parseInt(animInput.trim(), 10);
    if (isNaN(val) || !session || phase !== "ready") return;
    setAnimInput("");

    const searchSteps = treeRef.current.search(val);
    if (searchSteps.some((s) => s.type === "found")) {
      runSteps(searchSteps);
      return;
    }

    runSteps(treeRef.current.insert(val));
    executeSessionQuery(
      session.id,
      `INSERT INTO products VALUES (${val}, 'Item ${val}', 0) ON CONFLICT DO NOTHING`,
    )
      .then(() => fetchBTreeConceptState(session.id))
      .then((state) => {
        const tree = new BTree(2);
        tree.seed(state.keys);
        treeRef.current = tree;
        setSeedRoot(structuredClone(tree.root));
      })
      .catch(() => {});
  };

  const handleAnimSearch = () => {
    const val = parseInt(animInput.trim(), 10);
    if (isNaN(val)) return;
    setAnimInput("");
    runSteps(treeRef.current.search(val));
  };

  const runQuery = async () => {
    if (!session || phase !== "ready" || running) return;
    setRunning(true);
    setQueryError("");
    setLastResult(null);

    try {
      const result = await executeSessionQuery(session.id, query);
      setLastResult(result);
      await syncTree(session.id);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRunning(false);
    }
  };

  const statusLabel = () => {
    if (phase === "spawning") return "Starting sandbox...";
    if (phase === "seeding") return phaseMsg || "Seeding data...";
    if (phase === "error") return `Error: ${phaseMsg}`;
    if (phase === "ready") return "postgres · ready";
    return "";
  };

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual">
            <BTreeVisual step={currentStep} />
          </div>

          <div className="concept-bottom">
            <div className="concept-sql-panel">
              <div className="concept-sql-header">
                <span className={`session-dot ${phase}`} />
                <span className="session-label">{statusLabel()}</span>
                <button
                  className="concept-btn accent small"
                  disabled={phase !== "ready" || running}
                  onClick={runQuery}
                >
                  {running ? "Running..." : "Run"}
                  {!running && <kbd>⌘↵</kbd>}
                </button>
              </div>
              <textarea
                className="concept-sql-textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    runQuery();
                  }
                }}
                spellCheck={false}
                placeholder="Write SQL here..."
                disabled={phase !== "ready"}
              />
              {(lastResult || queryError) && (
                <div
                  className={`concept-sql-result ${queryError ? "error" : ""}`}
                >
                  {queryError
                    ? queryError
                    : `${lastResult!.message}  ·  ${lastResult!.elapsedMs.toFixed(0)} ms`}
                </div>
              )}
            </div>

            <div className="concept-anim-panel">
              <div className="concept-anim-label">Try it</div>
              <p className="concept-anim-note">
                Watch the tree decide where a value goes, step by step.
              </p>
              <div className="anim-row">
                <input
                  className="concept-input"
                  type="number"
                  placeholder="Value..."
                  value={animInput}
                  onChange={(e) => setAnimInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAnimInsert();
                  }}
                  disabled={phase !== "ready"}
                />
                <button
                  className="concept-btn accent"
                  onClick={handleAnimInsert}
                  disabled={phase !== "ready"}
                >
                  Insert
                </button>
                <button
                  className="concept-btn"
                  onClick={handleAnimSearch}
                  disabled={phase !== "ready"}
                >
                  Search
                </button>
              </div>

              {steps.length > 0 && (
                <div className="step-controls">
                  <button
                    className="step-btn"
                    onClick={() => {
                      setPlaying(false);
                      setStepIdx(0);
                    }}
                  >
                    ⏮
                  </button>
                  <button
                    className="step-btn"
                    onClick={() => {
                      setPlaying(false);
                      setStepIdx((i) => Math.max(0, i - 1));
                    }}
                  >
                    ‹
                  </button>
                  <span className="step-counter">
                    {stepIdx + 1} / {steps.length}
                  </span>
                  <button
                    className="step-btn"
                    onClick={() => {
                      setPlaying(false);
                      setStepIdx((i) => Math.min(steps.length - 1, i + 1));
                    }}
                  >
                    ›
                  </button>
                  <button
                    className="step-btn"
                    onClick={() => {
                      setPlaying(false);
                      setStepIdx(steps.length - 1);
                    }}
                  >
                    ⏭
                  </button>
                  <button
                    className="step-btn play"
                    onClick={() => setPlaying((p) => !p)}
                  >
                    {playing ? "⏸" : "⏵"}
                  </button>
                </div>
              )}

              <div className="concept-message" data-type={currentStep.type}>
                {currentStep.message}
              </div>
            </div>
          </div>
        </div>

        <aside className="concept-sidebar">
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What's happening</div>
            <p>
              Each box is a <strong>node</strong>. Keys inside are sorted. To
              find a value, the database starts at the top and at each node
              asks: "left or right?" It follows one path straight to the answer.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">
              Why not just scan every row?
            </div>
            <p>
              With 1 million rows, scanning takes 1 million steps. A B-tree
              takes about <strong>20</strong>, because each level cuts the
              remaining rows in half.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">When a node fills up</div>
            <p>
              Each node holds a limited number of keys. When it's full and a new
              value arrives, it <strong>splits</strong>, the middle key moves
              up and two smaller nodes replace it. This keeps the tree balanced.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Try it</div>
            <ul className="concept-tips">
              <li>
                Type <code>35</code> → Insert to watch the tree decide where it
                goes
              </li>
              <li>
                Type <code>25</code> → Search to see it found in 3 steps
              </li>
              <li>
                Run <code>DELETE FROM products WHERE id = 30;</code> and watch
                the tree update
              </li>
              <li>
                Run <code>EXPLAIN SELECT * FROM products WHERE id = 25;</code>{" "}
                to see Postgres confirm it uses the index
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
