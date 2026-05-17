import { useEffect, useRef, useState } from "react";
import { LSMTree } from "../../lib/lsm";
import type { LSMState, LSMStep } from "../../lib/lsm";
import { LSMVisual } from "./LSMVisual";
import "../btree/btree.css";
import "./lsm.css";

const INITIAL_SEED: [number, string][] = [
  [3, "c"], [7, "g"], [12, "l"], [18, "r"],
  [22, "v"], [31, "A"], [40, "H"], [47, "O"],
  [55, "W"], [60, "a"],
];

function makeIdleStep(state: LSMState): LSMStep {
  return {
    state,
    highlight: null,
    message: "LSM Tree ready. Insert a key to watch it flow through the levels.",
    type: "write",
  };
}

export function LSMConcept() {
  const treeRef = useRef<LSMTree | null>(null);
  if (!treeRef.current) {
    const t = new LSMTree();
    t.seed(INITIAL_SEED);
    treeRef.current = t;
  }

  const [seedState, setSeedState] = useState<LSMState>(() =>
    treeRef.current!.getState(),
  );
  const [steps, setSteps] = useState<LSMStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animInput, setAnimInput] = useState("");
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing || !steps.length) return;
    if (stepIdx >= steps.length - 1) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    playTimer.current = setTimeout(() => setStepIdx((i) => i + 1), 700);
    return () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, [playing, stepIdx, steps]);

  const currentStep = steps.length ? steps[stepIdx] : makeIdleStep(seedState);

  const runSteps = (newSteps: LSMStep[]) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    setSteps(newSteps);
    setStepIdx(0);
    setPlaying(true);
  };

  const handleInsert = () => {
    const val = parseInt(animInput.trim(), 10);
    if (isNaN(val)) return;
    setAnimInput("");
    runSteps(treeRef.current!.insert(val, `v${val}`));
    setSeedState(treeRef.current!.getState());
  };

  const handleSearch = () => {
    const val = parseInt(animInput.trim(), 10);
    if (isNaN(val)) return;
    setAnimInput("");
    runSteps(treeRef.current!.search(val));
  };

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual">
            <LSMVisual
              state={currentStep.state}
              highlight={currentStep.highlight}
              type={currentStep.type}
            />
          </div>

          <div className="lsm-controls">
            <div className="lsm-controls-row">
              <div className="concept-anim-label">Try it</div>
              <div className="anim-row">
                <input
                  className="concept-input"
                  type="number"
                  placeholder="Key..."
                  value={animInput}
                  onChange={(e) => setAnimInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInsert();
                  }}
                />
                <button className="concept-btn accent" onClick={handleInsert}>
                  Insert
                </button>
                <button className="concept-btn" onClick={handleSearch}>
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
            </div>
            <div
              className="concept-message"
              data-type={currentStep.type}
            >
              {currentStep.message}
            </div>
          </div>
        </div>

        <aside className="concept-sidebar">
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">How it works</div>
            <p>
              Every write goes to the <strong>MemTable</strong> — an in-memory
              sorted structure. Reads and writes are fast because everything stays
              in RAM.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">When MemTable fills up</div>
            <p>
              It gets <strong>flushed</strong> to disk as an{" "}
              <strong>SSTable</strong> — a sorted, immutable file. These pile up
              in L0. When L0 has too many, they get{" "}
              <strong>compacted</strong> into L1 via merge sort.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Why search is slower</div>
            <p>
              Unlike a B-tree (one sorted structure), an LSM tree has to check{" "}
              <strong>multiple SSTables</strong>: MemTable first, then L0 newest
              to oldest, then L1. In practice, bloom filters skip most of
              these checks.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Where it&apos;s used</div>
            <p>
              LSM is the storage engine behind <strong>RocksDB</strong>,{" "}
              <strong>Cassandra</strong>, <strong>LevelDB</strong>, and{" "}
              <strong>ScyllaDB</strong>. It excels at high write throughput —
              every write is sequential (append-only), which is fast on SSDs and
              spinning disks.
            </p>
          </div>

          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Try it</div>
            <ul className="concept-tips">
              <li>
                Insert <code>65</code> then <code>70</code> — the MemTable fills
                and flushes to L0 SSTable 3
              </li>
              <li>
                That triggers <strong>compaction</strong> — watch L0 collapse
                into L1
              </li>
              <li>
                Search <code>3</code> — it's in L1 after compaction
              </li>
              <li>
                Search <code>99</code> — watch it check every level and come up
                empty
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
