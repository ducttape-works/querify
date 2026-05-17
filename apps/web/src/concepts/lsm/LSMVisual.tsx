import type { CSSProperties } from "react";
import type { LSMHighlight, LSMState, LSMStepType } from "../../lib/lsm";
import { L0_CAPACITY, MEMTABLE_CAPACITY } from "../../lib/lsm";

const STEP_COLORS: Record<LSMStepType, string> = {
  write: "var(--accent)",
  flush: "#f59e0b",
  compact: "#8b5cf6",
  "search-mem": "#3b82f6",
  "search-l0": "#3b82f6",
  "search-l1": "#8b5cf6",
  found: "#16a34a",
  "not-found": "#dc2626",
};

type Props = {
  state: LSMState;
  highlight: LSMHighlight;
  type: LSMStepType;
};

export function LSMVisual({ state, highlight: hl, type }: Props) {
  const hlColor = STEP_COLORS[type];

  const entryStyle = (
    level: "memtable" | "l0" | "l1",
    tableIdx: number | undefined,
    ki: number,
  ): CSSProperties => {
    if (hl?.level !== level) return {};
    if (hl.keyIdx !== ki) return {};
    if (tableIdx !== undefined && hl.tableIdx !== tableIdx) return {};
    return { background: hlColor, color: "#fff", borderColor: hlColor };
  };

  const boxStyle = (
    level: "memtable" | "l0" | "l1",
    tableIdx?: number,
  ): CSSProperties => {
    if (hl?.level !== level) return {};
    if (hl.keyIdx !== undefined) return {};
    if (tableIdx !== undefined && hl.tableIdx !== tableIdx) return {};
    return { borderColor: hlColor, background: `${hlColor}18` };
  };

  return (
    <div className="lsm-tree">
      <div className="lsm-row">
        <div className="lsm-row-label">
          <span className="lsm-level-name">MemTable</span>
          <span className="lsm-row-meta">
            {state.memTable.length}/{MEMTABLE_CAPACITY}
          </span>
        </div>
        <div className="lsm-entries-wrap">
          <div className="lsm-sstable" style={boxStyle("memtable")}>
            {state.memTable.length === 0 ? (
              <span className="lsm-placeholder">empty</span>
            ) : (
              state.memTable.map((e, i) => (
                <div
                  key={e.key}
                  className="lsm-entry"
                  style={entryStyle("memtable", undefined, i)}
                >
                  {e.key}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lsm-row">
        <div className="lsm-row-label">
          <span className="lsm-level-name">L0</span>
          <span className="lsm-row-meta">
            {state.l0.length}/{L0_CAPACITY} SSTables
          </span>
        </div>
        <div className="lsm-entries-wrap">
          {state.l0.length === 0 ? (
            <span className="lsm-placeholder">empty</span>
          ) : (
            state.l0.map((sst, si) => (
              <div key={sst.id} className="lsm-sstable" style={boxStyle("l0", si)}>
                {sst.entries.map((e, ei) => (
                  <div
                    key={e.key}
                    className="lsm-entry"
                    style={entryStyle("l0", si, ei)}
                  >
                    {e.key}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lsm-row">
        <div className="lsm-row-label">
          <span className="lsm-level-name">L1</span>
          <span className="lsm-row-meta">
            {state.l1 ? `${state.l1.entries.length} entries` : "empty"}
          </span>
        </div>
        <div className="lsm-entries-wrap">
          {!state.l1 ? (
            <span className="lsm-placeholder">empty</span>
          ) : (
            <div
              className="lsm-sstable"
              style={boxStyle("l1")}
            >
              {state.l1.entries.map((e, ei) => (
                <div
                  key={e.key}
                  className="lsm-entry"
                  style={entryStyle("l1", undefined, ei)}
                >
                  {e.key}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
