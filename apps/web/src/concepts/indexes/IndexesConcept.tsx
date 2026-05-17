import { useEffect, useMemo, useRef, useState } from "react";

import "../btree/btree.css";
import "./indexes.css";

type IndexCase = {
  key: string;
  label: string;
  query: string;
  rowsMatched: number;
  tableShare: number;
  winner: "Index path" | "Full table scan";
  heapPagesViaIndex: number;
  heapPagesViaScan: number;
  activeBranch: "left" | "middle" | "right" | "all";
  activeLeaves: number[];
  rootLabel: string;
  branchLabels: [string, string, string];
  leafLabels: [string, string, string, string, string, string];
  steps: string[];
  note: string;
  takeaway: string;
};

const TOTAL_HEAP_PAGES = 10_000;

const CASES: IndexCase[] = [
  {
    key: "point",
    label: "Find one row",
    query: "SELECT * FROM orders WHERE id = 824991;",
    rowsMatched: 1,
    tableShare: 0.0001,
    winner: "Index path",
    heapPagesViaIndex: 1,
    heapPagesViaScan: TOTAL_HEAP_PAGES,
    activeBranch: "right",
    activeLeaves: [5],
    rootLabel: "500",
    branchLabels: ["120 / 240", "420 / 560", "760 / 900"],
    leafLabels: ["1–120", "121–240", "241–420", "421–560", "561–760", "761–1000+"],
    steps: [
      "Root compares the search key and goes right.",
      "The branch node narrows the search to one leaf.",
      "The leaf stores a pointer to the real row, not the whole row itself.",
      "The database reads one page from the main table and returns the row.",
    ],
    note:
      "This is the best case for an index tree: one route through the tree, then one read from the main table.",
    takeaway:
      "For precise lookups, the index tree avoids almost all main-table work, so it clearly wins.",
  },
  {
    key: "narrow",
    label: "Find a small group",
    query: "SELECT * FROM orders WHERE customer_id = 1042;",
    rowsMatched: 320,
    tableShare: 0.032,
    winner: "Index path",
    heapPagesViaIndex: 64,
    heapPagesViaScan: TOTAL_HEAP_PAGES,
    activeBranch: "middle",
    activeLeaves: [2, 3],
    rootLabel: "5000",
    branchLabels: ["200 / 600", "900 / 1300", "1600 / 2200"],
    leafLabels: ["101", "510", "880", "1042", "1180", "1500"],
    steps: [
      "The tree still narrows the search to a small part of the index.",
      "Several leaf entries match the filter.",
      "Each leaf entry points back into pages in the main table.",
      "64 table pages is still much cheaper than reading the whole table.",
    ],
    note:
      "The tree now finds many pointers, but they still lead to only a small slice of the main table.",
    takeaway:
      "Indexes still help when the match set stays small enough that the follow-up reads stay limited.",
  },
  {
    key: "broad",
    label: "Find most rows",
    query: "SELECT * FROM orders WHERE status = 'paid';",
    rowsMatched: 620_000,
    tableShare: 62,
    winner: "Full table scan",
    heapPagesViaIndex: 8_900,
    heapPagesViaScan: TOTAL_HEAP_PAGES,
    activeBranch: "middle",
    activeLeaves: [2, 3, 4],
    rootLabel: "m",
    branchLabels: ["cancelled / completed", "paid / pending", "refunded / shipped"],
    leafLabels: ["cancelled", "completed", "paid", "paid", "paid", "shipped"],
    steps: [
      "Before running the query, Postgres looks at table statistics.",
      "Those stats say 'paid' matches a huge part of the table.",
      "The status index could still find 'paid', but it would lead to almost the whole table.",
      "So Postgres usually chooses a full table scan before execution even starts.",
    ],
    note:
      "This tree shows what the status index would do if you forced it. The important point is that Postgres usually rejects this path up front.",
    takeaway:
      "An index is not automatically faster. If most rows match, reading the whole table once usually wins.",
  },
];

export function IndexesConcept() {
  const [activeKey, setActiveKey] = useState(CASES[0].key);
  const [notice, setNotice] = useState(
    "Press Run lookup. First see how Postgres decides on a path. Then see what the index would do if it is actually used.",
  );
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [resolved, setResolved] = useState(false);

  const timers = useRef<number[]>([]);

  const activeCase = useMemo(
    () => CASES.find((item) => item.key === activeKey) ?? CASES[0],
    [activeKey],
  );
  const whereClause = activeCase.query.split(" WHERE ")[1]?.replace(/;$/, "") ?? "";

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const reset = (nextNotice?: string) => {
    clearTimers();
    setRunning(false);
    setStep(-1);
    setResolved(false);
    setNotice(
      nextNotice ??
        "Press Run lookup. First see how Postgres decides on a path. Then see what the index would do if it is actually used.",
    );
  };

  const run = () => {
    reset("Watch the decision first. For broad matches, Postgres usually decides before it ever touches the index.");
    setRunning(true);

    activeCase.steps.forEach((message, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setStep(index);
          setNotice(message);

          if (index === activeCase.steps.length - 1) {
            setRunning(false);
            setResolved(true);
          }
        }, index * 420),
      );
    });
  };

  const pickCase = (nextKey: string) => {
    if (nextKey === activeKey) return;

    setActiveKey(nextKey);
    reset("Change the query, then run it again. The database decision changes because the amount of matching data changes.");
  };

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual idx6-shell">
            <div className="idx6-sql-card">
              <div className="idx6-sql-label">The SQL query</div>
              <div className="idx6-sql">
                <span className="idx6-sql-keyword">SELECT</span> *{" "}
                <span className="idx6-sql-keyword">FROM</span> orders{" "}
                <span className="idx6-sql-keyword">WHERE</span> {whereClause};
              </div>
              <div className="idx6-sql-sub">
                This page shows two things: how the database chooses a path, and what the index tree would do if that path gets picked.
              </div>
            </div>

            <div className="idx6-notice">
              <span className="idx6-notice-label">Notice this</span>
              <span>{notice}</span>
            </div>

            <div className="idx6-action-bar">
              <div className="idx6-action-copy">
                <div className="idx6-control-label">1. Pick a query</div>
                <div className="idx6-case-row">
                  {CASES.map((item) => (
                    <button
                      key={item.key}
                      className={`idx6-case-btn${item.key === activeKey ? " active" : ""}`}
                      onClick={() => pickCase(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="idx6-action-copy">
                <div className="idx6-control-label">2. Run the walkthrough</div>
                <div className="idx6-controls">
                  <button
                    className="concept-btn accent"
                    onClick={run}
                    disabled={running}
                  >
                    {running ? "Running…" : "Run lookup"}
                  </button>
                  <button className="concept-btn" onClick={() => reset()}>
                    Reset
                  </button>
                  <span className="idx6-control-hint">
                    {step < 0
                      ? "Waiting to start"
                      : resolved
                        ? "Done"
                        : `Step ${step + 1} of ${activeCase.steps.length}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="idx6-step-strip">
              {activeCase.steps.map((item, index) => (
                <div
                  key={item}
                  className={`idx6-step-pill${step === index ? " active" : ""}${step > index || resolved ? " done" : ""}`}
                >
                  <span className="idx6-step-num">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="idx6-stats">
              <Stat label="Rows matched" value={activeCase.rowsMatched.toLocaleString()} />
              <Stat label="Share of table" value={`${activeCase.tableShare}%`} />
              <Stat
                label="Winner"
                value={resolved ? activeCase.winner : "?"}
                highlight={resolved}
              />
            </div>

            <div className="idx6-main">
                <div className="idx6-card">
                <div className="idx6-card-eyebrow">
                  {activeCase.key === "broad"
                    ? "What the index path would do"
                    : "What the index tree does"}
                </div>
                <div className="idx6-card-title">
                  {activeCase.key === "broad"
                    ? "Find many matching pointers"
                    : "Find pointers to the right rows"}
                </div>
                <div className="idx6-card-body">
                  {activeCase.key === "broad"
                    ? "The status index can still find 'paid' entries. The problem is that there are too many of them, so following those pointers becomes expensive."
                    : "The tree does not store the full rows. It narrows the search, lands on leaves, and gives the database pointers to the real rows in the main table."}
                </div>
                <div className="idx6-term-note">
                  In Postgres, that main table storage is called the <strong>heap</strong>.
                  The heap is where the full rows live. The index only helps you find them faster.
                </div>

                <IndexTree activeCase={activeCase} step={step} />

                <div className="idx6-tree-note">
                  {resolved ? activeCase.note : "Run the lookup to watch the path through the tree."}
                </div>
              </div>

              <div className="idx6-card">
                <div className="idx6-card-eyebrow">What actually costs time</div>
                <div className="idx6-card-title">Main table pages read</div>
                <div className="idx6-card-body">
                  Postgres tries to pick the cheaper path before execution starts. The key question is how much of the main table still has to be read.
                </div>

                <CostRow
                  label="Index path"
                  pages={activeCase.heapPagesViaIndex}
                  totalPages={TOTAL_HEAP_PAGES}
                  tone={activeCase.winner === "Index path" ? "green" : "amber"}
                  active={resolved && activeCase.winner === "Index path"}
                />

                <CostRow
                  label="Full table scan"
                  pages={activeCase.heapPagesViaScan}
                  totalPages={TOTAL_HEAP_PAGES}
                  tone={activeCase.winner === "Full table scan" ? "green" : "amber"}
                  active={resolved && activeCase.winner === "Full table scan"}
                />

                <div className="idx6-winner">
                  <span className="idx6-winner-label">Chosen path</span>
                  <span className={`idx6-winner-chip${resolved ? " active" : ""}`}>
                    {resolved ? activeCase.winner : "Run the lookup"}
                  </span>
                </div>
              </div>
            </div>

            <div className="idx6-takeaway">
              <div className="idx6-takeaway-eyebrow">Core lesson</div>
              <div className="idx6-takeaway-title">
                A B-tree is useful because it avoids table work.
              </div>
              <p>
                {resolved
                  ? activeCase.takeaway
                  : "Point lookups and small filters let the tree avoid most table pages. Very broad filters still use the tree structure, but they end up touching so much of the table that reading the table once can win."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexTree({
  activeCase,
  step,
}: {
  activeCase: IndexCase;
  step: number;
}) {
  const rootActive = step >= 0;
  const branchActive = step >= 1;
  const leafActive = step >= 2;
  const heapActive = step >= 3;

  return (
    <div className="idx6-tree">
      <svg viewBox="0 0 520 220" className="idx6-tree-svg">
        <TreeEdge fromX={260} fromY={52} toX={110} toY={108} active={branchActive && (activeCase.activeBranch === "left" || activeCase.activeBranch === "all")} />
        <TreeEdge fromX={260} fromY={52} toX={260} toY={108} active={branchActive && (activeCase.activeBranch === "middle" || activeCase.activeBranch === "all")} />
        <TreeEdge fromX={260} fromY={52} toX={410} toY={108} active={branchActive && (activeCase.activeBranch === "right" || activeCase.activeBranch === "all")} />

        <TreeEdge fromX={110} fromY={122} toX={55} toY={176} active={leafActive && activeCase.activeLeaves.includes(0)} />
        <TreeEdge fromX={110} fromY={122} toX={145} toY={176} active={leafActive && activeCase.activeLeaves.includes(1)} />
        <TreeEdge fromX={260} fromY={122} toX={225} toY={176} active={leafActive && activeCase.activeLeaves.includes(2)} />
        <TreeEdge fromX={260} fromY={122} toX={315} toY={176} active={leafActive && activeCase.activeLeaves.includes(3)} />
        <TreeEdge fromX={410} fromY={122} toX={395} toY={176} active={leafActive && activeCase.activeLeaves.includes(4)} />
        <TreeEdge fromX={410} fromY={122} toX={475} toY={176} active={leafActive && activeCase.activeLeaves.includes(5)} />

        <TreeNode x={260} y={34} width={88} label={activeCase.rootLabel} active={rootActive} />
        <TreeNode
          x={110}
          y={108}
          width={88}
          label={activeCase.branchLabels[0]}
          active={branchActive && (activeCase.activeBranch === "left" || activeCase.activeBranch === "all")}
        />
        <TreeNode
          x={260}
          y={108}
          width={88}
          label={activeCase.branchLabels[1]}
          active={branchActive && (activeCase.activeBranch === "middle" || activeCase.activeBranch === "all")}
        />
        <TreeNode
          x={410}
          y={108}
          width={88}
          label={activeCase.branchLabels[2]}
          active={branchActive && (activeCase.activeBranch === "right" || activeCase.activeBranch === "all")}
        />

        <TreeLeaf x={55} y={176} label={activeCase.leafLabels[0]} active={leafActive && activeCase.activeLeaves.includes(0)} />
        <TreeLeaf x={145} y={176} label={activeCase.leafLabels[1]} active={leafActive && activeCase.activeLeaves.includes(1)} />
        <TreeLeaf x={225} y={176} label={activeCase.leafLabels[2]} active={leafActive && activeCase.activeLeaves.includes(2)} />
        <TreeLeaf x={315} y={176} label={activeCase.leafLabels[3]} active={leafActive && activeCase.activeLeaves.includes(3)} />
        <TreeLeaf x={395} y={176} label={activeCase.leafLabels[4]} active={leafActive && activeCase.activeLeaves.includes(4)} />
        <TreeLeaf x={475} y={176} label={activeCase.leafLabels[5]} active={leafActive && activeCase.activeLeaves.includes(5)} />
      </svg>

      <div className="idx6-heap-zone">
        <div className="idx6-heap-label">real table pages behind those pointers</div>
        <div className="idx6-heap-pages">
          {renderHeapPages(activeCase, heapActive)}
        </div>
      </div>
    </div>
  );
}

function TreeEdge({
  fromX,
  fromY,
  toX,
  toY,
  active,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  active: boolean;
}) {
  return (
    <line
      x1={fromX}
      y1={fromY}
      x2={toX}
      y2={toY}
      className={`idx6-tree-edge${active ? " active" : ""}`}
    />
  );
}

function TreeNode({
  x,
  y,
  width,
  label,
  active,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  active: boolean;
}) {
  return (
    <g transform={`translate(${x - width / 2}, ${y - 16})`}>
      <rect
        width={width}
        height={32}
        rx={8}
        className={`idx6-tree-box${active ? " active" : ""}`}
      />
      <text
        x={width / 2}
        y={21}
        textAnchor="middle"
        className={`idx6-tree-text${active ? " active" : ""}`}
      >
        {label}
      </text>
    </g>
  );
}

function TreeLeaf({
  x,
  y,
  label,
  active,
}: {
  x: number;
  y: number;
  label: string;
  active: boolean;
}) {
  return (
    <g transform={`translate(${x - 42}, ${y - 14})`}>
      <rect
        width={84}
        height={28}
        rx={7}
        className={`idx6-tree-leaf-box${active ? " active" : ""}`}
      />
      <text
        x={42}
        y={18}
        textAnchor="middle"
        className={`idx6-tree-leaf-text${active ? " active" : ""}`}
      >
        {label}
      </text>
    </g>
  );
}

function renderHeapPages(activeCase: IndexCase, heapActive: boolean) {
  if (!heapActive) {
    return <div className="idx6-heap-empty">heap fetch happens after the tree walk</div>;
  }

  if (activeCase.key === "point") {
    return <div className="idx6-heap-chip active">page 5128</div>;
  }

  if (activeCase.key === "narrow") {
    return (
      <>
        <div className="idx6-heap-chip active">page 192</div>
        <div className="idx6-heap-chip active">page 193</div>
        <div className="idx6-heap-chip active">page 201</div>
        <div className="idx6-heap-chip active">+61 more</div>
      </>
    );
  }

  return (
    <>
      <div className="idx6-heap-chip active">page 18</div>
      <div className="idx6-heap-chip active">page 39</div>
      <div className="idx6-heap-chip active">page 104</div>
      <div className="idx6-heap-chip active">page 768</div>
      <div className="idx6-heap-chip active">page 1420</div>
      <div className="idx6-heap-chip active">+8,895 more</div>
    </>
  );
}

function CostRow({
  label,
  pages,
  totalPages,
  tone,
  active,
}: {
  label: string;
  pages: number;
  totalPages: number;
  tone: "green" | "amber";
  active: boolean;
}) {
  const width = `${Math.max(2, Math.round((pages / totalPages) * 100))}%`;

  return (
    <div className={`idx6-cost${active ? " active" : ""}`}>
      <div className="idx6-cost-head">
        <span>{label}</span>
        <span>
          {pages.toLocaleString()} / {totalPages.toLocaleString()} pages
        </span>
      </div>
      <div className="idx6-cost-bar">
        <div className={`idx6-cost-fill ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`idx6-stat${highlight ? " highlight" : ""}`}>
      <div className="idx6-stat-label">{label}</div>
      <div className="idx6-stat-value">{value}</div>
    </div>
  );
}
