import { useEffect, useMemo, useRef, useState } from "react";

import "../btree/btree.css";
import "./writepath.css";

type Stage = "idle" | "memory" | "durable" | "flushed";
type Mode = "normal" | "crashed" | "recovered";
type Focus = "memory" | "durable" | "flushed" | "crash";

const INSERT_ROW = { id: 34, name: "Nora", score: 88 };

export function WritePathConcept() {
  const [stage, setStage] = useState<Stage>("idle");
  const [mode, setMode] = useState<Mode>("normal");
  const [preCrashStage, setPreCrashStage] = useState<Stage>("idle");
  const [notice, setNotice] = useState(
    "Start with one write. Watch which column changes first.",
  );
  const [showManual, setShowManual] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const focusTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimer.current) window.clearTimeout(focusTimer.current);
    };
  }, []);

  const flash = (nextFocus: Focus) => {
    setFocus(nextFocus);

    if (focusTimer.current) window.clearTimeout(focusTimer.current);

    focusTimer.current = window.setTimeout(() => {
      setFocus(null);
      focusTimer.current = null;
    }, 700);
  };

  const setMemoryState = () => {
    setMode("normal");
    setStage("memory");
    setNotice(
      "The row is now only in memory. If the server crashes here, it is lost.",
    );
    flash("memory");
  };

  const setDurableState = () => {
    setMode("normal");
    setStage("durable");
    setNotice(
      "The commit is now safe after crash because WAL is durable. But the table files still have not changed.",
    );
    flash("durable");
  };

  const setFlushedState = () => {
    setMode("normal");
    setStage("flushed");
    setNotice(
      "Now the data files changed too. The row is in memory, safe after crash, and already in the table and index files.",
    );
    flash("flushed");
  };

  const handlePrimary = () => {
    if (mode === "crashed") {
      handleRestart();
      return;
    }

    if (mode === "recovered" || stage === "flushed") {
      handleReset();
      return;
    }

    if (stage === "idle") {
      setMemoryState();
      return;
    }

    if (stage === "memory") {
      setDurableState();
      return;
    }

    if (stage === "durable") {
      setFlushedState();
    }
  };

  const handleCrash = () => {
    if (stage === "idle" || mode === "crashed") return;

    setMode("crashed");
    setPreCrashStage(stage);

    if (stage === "memory") {
      setNotice(
        "Crash now: the row disappears. It only existed in memory, so restart cannot bring it back.",
      );
    } else if (stage === "durable") {
      setNotice(
        "Crash now: the row survives restart. WAL will replay it even though the table files never got flushed.",
      );
    } else {
      setNotice(
        "Crash now: the row survives because it is already in the table and index files.",
      );
    }

    flash("crash");
  };

  const handleRestart = () => {
    if (mode !== "crashed") return;

    setMode("recovered");

    if (preCrashStage === "memory") {
      setStage("idle");
      setNotice(
        "After restart, the row is gone. No durable commit existed, so there was nothing to recover.",
      );
      flash("memory");
      return;
    }

    if (preCrashStage === "durable") {
      setStage("durable");
      setNotice(
        "After restart, the row comes back. WAL replay rebuilt it even though the data files had not been flushed before the crash.",
      );
      flash("durable");
      return;
    }

    setStage("flushed");
    setNotice(
      "After restart, the row is still there. The table and index files already contained it.",
    );
    flash("flushed");
  };

  const handleReset = () => {
    setStage("idle");
    setMode("normal");
    setPreCrashStage("idle");
    setNotice("Start with one write. Watch which column changes first.");
    setFocus(null);
  };

  const state = useMemo(() => {
    const inMemory = mode !== "crashed" && stage !== "idle";
    const durable = stage === "durable" || stage === "flushed";
    const inFiles = stage === "flushed";

    if (mode === "crashed" && preCrashStage === "memory") {
      return {
        inMemory: false,
        durable: false,
        inFiles: false,
        visible: false,
        client: "lost connection",
      };
    }

    if (mode === "crashed" && preCrashStage === "durable") {
      return {
        inMemory: false,
        durable: true,
        inFiles: false,
        visible: false,
        client: "lost connection",
      };
    }

    if (mode === "crashed" && preCrashStage === "flushed") {
      return {
        inMemory: false,
        durable: true,
        inFiles: true,
        visible: false,
        client: "lost connection",
      };
    }

    return {
      inMemory,
      durable,
      inFiles,
      visible: stage === "durable" || stage === "flushed",
      client:
        stage === "idle"
          ? "waiting"
          : stage === "memory"
            ? "pending"
            : "commit ok",
    };
  }, [mode, preCrashStage, stage]);

  const primaryLabel =
    mode === "crashed"
      ? "Restart server"
      : mode === "recovered" || stage === "flushed"
        ? "Reset lesson"
        : stage === "idle"
          ? "Write row"
          : stage === "memory"
            ? "Make commit durable"
            : "Flush data files";

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual wp4-shell">
            <div className="wp4-header">
              <div className="wp4-sql">
                <span className="wp4-sql-keyword">INSERT INTO</span> users{" "}
                <span className="wp4-sql-keyword">VALUES</span> ({INSERT_ROW.id},{" "}
                <span className="wp4-sql-string">'{INSERT_ROW.name}'</span>, {INSERT_ROW.score})
              </div>

              <div className="wp4-controls">
                <button className="concept-btn accent" onClick={handlePrimary}>
                  {primaryLabel}
                </button>
                {stage !== "idle" && mode !== "crashed" && (
                  <button className="concept-btn" onClick={handleCrash}>
                    Crash now
                  </button>
                )}
                <button
                  className="concept-btn"
                  onClick={() => setShowManual((current) => !current)}
                >
                  {showManual ? "Hide manual controls" : "Show manual controls"}
                </button>
              </div>

              {showManual && (
                <div className="wp4-manual">
                  <button className="concept-btn" onClick={setMemoryState}>
                    Memory only
                  </button>
                  <button className="concept-btn" onClick={setDurableState}>
                    Durable in WAL
                  </button>
                  <button className="concept-btn" onClick={setFlushedState}>
                    Flushed to files
                  </button>
                  <button className="concept-btn" onClick={handleReset}>
                    Reset
                  </button>
                </div>
              )}
            </div>

            <div className="wp4-notice">
              <span className="wp4-notice-label">Notice this</span>
              <span>{notice}</span>
            </div>

            <div className="wp4-stage-legend">
              <div className={`wp4-pill${stage === "memory" ? " active" : ""}`}>
                1. memory changed
              </div>
              <div className={`wp4-pill${stage === "durable" ? " active" : ""}`}>
                2. safe after crash
              </div>
              <div className={`wp4-pill${stage === "flushed" ? " active" : ""}`}>
                3. files changed
              </div>
            </div>

            <div className="wp4-columns">
              <StateColumn
                active={focus === "memory"}
                eyebrow="memory only"
                title="In memory"
                body="Shared buffers changed, but a crash can still erase the row."
                state={state.inMemory ? "Row exists here" : "Row does not exist here"}
                tone={state.inMemory ? "blue" : "muted"}
                row={state.inMemory ? "id=34 Nora" : ""}
              />

              <StateColumn
                active={focus === "durable"}
                eyebrow="made safe by WAL"
                title="Safe after crash"
                body="This is the durable commit moment. Restart can restore the row even if files did not flush."
                state={state.durable ? "Restart keeps this row" : "Restart loses this row"}
                tone={state.durable ? "green" : "amber"}
                row={state.durable ? "recover id=34" : ""}
              />

              <StateColumn
                active={focus === "flushed"}
                eyebrow="table + index files"
                title="Already in data files"
                body="Checkpoint finally writes the row and index entry to the actual files."
                state={state.inFiles ? "Row already on disk" : "Files still unchanged"}
                tone={state.inFiles ? "green" : "muted"}
                row={state.inFiles ? "(34, Nora) + key 34" : ""}
              />
            </div>

            <div className={`wp4-summary${focus === "crash" ? " pulse" : ""}`}>
              <MiniFact label="Client" value={state.client} />
              <MiniFact label="Readers see row" value={state.visible ? "yes" : "no"} />
              <MiniFact label="Crash outcome" value={state.durable ? "survives" : "lost"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StateColumn({
  active,
  eyebrow,
  title,
  body,
  state,
  tone,
  row,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  body: string;
  state: string;
  tone: "blue" | "green" | "amber" | "muted";
  row: string;
}) {
  return (
    <section className={`wp4-column ${active ? "active" : ""}`}>
      <div className="wp4-column-eyebrow">{eyebrow}</div>
      <div className="wp4-column-title">{title}</div>
      <p className="wp4-column-body">{body}</p>
      <div className={`wp4-state ${tone}`}>{state}</div>
      {row ? <div className="wp4-row-chip">{row}</div> : <div className="wp4-row-empty">empty</div>}
    </section>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="wp4-mini-fact">
      <div className="wp4-mini-label">{label}</div>
      <div className="wp4-mini-value">{value}</div>
    </div>
  );
}
