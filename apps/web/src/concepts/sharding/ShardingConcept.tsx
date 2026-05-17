import { useState } from "react";
import "../btree/btree.css";
import "./sharding.css";

type ShPhase = "idle" | "loaded" | "partitioned";
type IdxMode = "global" | "local";
type QueryType = "id" | "daterange";

const ORDERS = [
  { id: 1, date: "2024-01-05", customer: "Alice", amount: 120 },
  { id: 2, date: "2024-01-18", customer: "Bob", amount: 340 },
  { id: 3, date: "2024-02-09", customer: "Carol", amount: 75 },
  { id: 4, date: "2024-03-22", customer: "Dave", amount: 210 },
  { id: 5, date: "2024-04-03", customer: "Eve", amount: 90 },
  { id: 6, date: "2024-04-28", customer: "Frank", amount: 450 },
  { id: 7, date: "2024-05-15", customer: "Grace", amount: 180 },
  { id: 8, date: "2024-06-01", customer: "Henry", amount: 290 },
  { id: 9, date: "2024-07-12", customer: "Iris", amount: 130 },
  { id: 10, date: "2024-08-08", customer: "Jack", amount: 670 },
  { id: 11, date: "2024-08-25", customer: "Kate", amount: 155 },
  { id: 12, date: "2024-09-30", customer: "Leo", amount: 220 },
];

function getShard(date: string): 1 | 2 | 3 {
  const month = parseInt(date.split("-")[1]);
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  return 3;
}

const SHARDS = [
  { id: 1 as const, label: "Shard 1", range: "Jan – Mar 2024", color: "#3b82f6" },
  { id: 2 as const, label: "Shard 2", range: "Apr – Jun 2024", color: "#8b5cf6" },
  { id: 3 as const, label: "Shard 3", range: "Jul – Sep 2024", color: "#f59e0b" },
];

type QueryResult = {
  steps: string[];
  accessedShards: (1 | 2 | 3)[];
  prunedShards: (1 | 2 | 3)[];
  result: string;
};

function runQuery(queryType: QueryType, queryId: number, idxMode: IdxMode): QueryResult {
  if (queryType === "daterange") {
    return {
      steps: [
        "Coordinator receives: SELECT * FROM orders WHERE date BETWEEN '2024-01-01' AND '2024-01-15'",
        "Coordinator checks the shard ranges, date is the shard key",
        "Jan 1–15 falls inside Shard 1 (Jan–Mar). Shards 2 and 3 are outside the range.",
        "Coordinator routes query to Shard 1 only, Shards 2 and 3 are pruned.",
        "Shard 1 returns: id=1 (Jan 5, Alice, $120)",
        "Total: 1 shard read, 2 shards pruned",
      ],
      accessedShards: [1],
      prunedShards: [2, 3],
      result: "1 row returned (id=1). 2 shards skipped by shard pruning.",
    };
  }

  const targetOrder = ORDERS.find((o) => o.id === queryId);
  const targetShard = targetOrder ? getShard(targetOrder.date) : null;

  if (idxMode === "global") {
    const accessed = targetShard ? [targetShard] : [];
    const pruned = ([1, 2, 3] as (1 | 2 | 3)[]).filter((s) => s !== targetShard);
    return {
      steps: [
        `Coordinator receives: SELECT * FROM orders WHERE id = ${queryId}`,
        `Global index lookup: search key=${queryId} in the cross-shard B-tree`,
        targetOrder
          ? `Index entry found: key=${queryId} → (Shard ${targetShard}, row ${targetOrder.id % 4})`
          : `Key=${queryId} not found in global index`,
        targetOrder
          ? `Coordinator routes directly to Shard ${targetShard}, other shards are skipped`
          : "No rows returned",
        ...(targetOrder
          ? [
              `Shard ${targetShard} fetches the row from its heap`,
              `Result: id=${targetOrder.id}, ${targetOrder.customer}, ${targetOrder.date}, $${targetOrder.amount}`,
            ]
          : []),
      ],
      accessedShards: accessed,
      prunedShards: pruned,
      result: targetOrder
        ? `1 row (id=${targetOrder.id}, ${targetOrder.customer}). 2 shards skipped via global index.`
        : "0 rows. Global index confirms key does not exist.",
    };
  }

  if (!targetOrder || !targetShard) {
    return {
      steps: [
        `Coordinator receives: SELECT * FROM orders WHERE id = ${queryId}`,
        "Local indexes: coordinator does not know which shard holds this id",
        "Coordinator broadcasts query to all 3 shards in parallel",
        "Shard 1: searches local B-tree for key=" + queryId + " → not found",
        "Shard 2: searches local B-tree for key=" + queryId + " → not found",
        "Shard 3: searches local B-tree for key=" + queryId + " → not found",
        "All shards return empty, id not found",
      ],
      accessedShards: [1, 2, 3],
      prunedShards: [],
      result: "0 rows. All 3 shards were queried (no pruning with local index on non-shard key).",
    };
  }

  return {
    steps: [
      `Coordinator receives: SELECT * FROM orders WHERE id = ${queryId}`,
      "Local indexes: coordinator does not know which shard holds this id",
      "Coordinator broadcasts query to all 3 shards in parallel",
      `Shard 1 local B-tree: ${targetShard === 1 ? `key=${queryId} found` : `key=${queryId} not found`}`,
      `Shard 2 local B-tree: ${targetShard === 2 ? `key=${queryId} found` : `key=${queryId} not found`}`,
      `Shard 3 local B-tree: ${targetShard === 3 ? `key=${queryId} found` : `key=${queryId} not found`}`,
      `Shard ${targetShard} returns: id=${targetOrder.id}, ${targetOrder.customer}, $${targetOrder.amount}`,
    ],
    accessedShards: [1, 2, 3],
    prunedShards: [],
    result: `1 row (id=${targetOrder.id}, ${targetOrder.customer}). All 3 shards were queried, no pruning possible with local index on a non-shard key.`,
  };
}

export function ShardingConcept() {
  const [phase, setPhase] = useState<ShPhase>("idle");
  const [idxMode, setIdxMode] = useState<IdxMode>("global");
  const [queryType, setQueryType] = useState<QueryType>("id");
  const [queryId, setQueryId] = useState(7);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  function shardSQL(): string {
    if (phase === "idle" || phase === "loaded") {
      return `-- Range partition by date (PostgreSQL)\nCREATE TABLE orders (\n  id       INT,\n  date     DATE,\n  customer TEXT,\n  amount   NUMERIC\n) PARTITION BY RANGE (date);\n\nCREATE TABLE orders_q1 PARTITION OF orders\n  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');\n\nCREATE TABLE orders_q2 PARTITION OF orders\n  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');\n\nCREATE TABLE orders_q3 PARTITION OF orders\n  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');`;
    }
    if (queryType === "daterange") {
      return `-- Date range query, coordinator prunes shards\nSELECT * FROM orders\nWHERE date BETWEEN '2024-01-01' AND '2024-01-15';\n\n-- Execution plan shows partition pruning\nEXPLAIN SELECT * FROM orders\n  WHERE date BETWEEN '2024-01-01' AND '2024-01-15';\n-- Partitions Pruned: orders_q2, orders_q3\n-- Seq Scan on orders_q1 (only Shard 1 accessed)`;
    }
    if (idxMode === "global") {
      return `-- Global index lookup (non-shard key)\nSELECT * FROM orders WHERE id = ${queryId};\n\n-- Global index maps key → (shard, row)\nEXPLAIN SELECT * FROM orders WHERE id = ${queryId};\n-- Index Scan on global_idx_orders_id\n-- Coordinator routes to exactly 1 shard\n\n-- Maintain global index on write:\nCREATE UNIQUE INDEX global_idx_orders_id ON orders (id);`;
    }
    return `-- Local index lookup (non-shard key)\nSELECT * FROM orders WHERE id = ${queryId};\n\n-- No global index, coordinator broadcasts\nEXPLAIN SELECT * FROM orders WHERE id = ${queryId};\n-- Parallel scan across all 3 shards\n-- Each shard searches its local B-tree\n-- Results merged at coordinator\n\n-- Local indexes (one per shard):\nCREATE INDEX ON orders_q1 (id);\nCREATE INDEX ON orders_q2 (id);\nCREATE INDEX ON orders_q3 (id);`;
  }

  const shardRows = ORDERS.reduce(
    (acc, o) => {
      acc[getShard(o.date)].push(o);
      return acc;
    },
    { 1: [], 2: [], 3: [] } as Record<1 | 2 | 3, typeof ORDERS>,
  );

  const handleRunQuery = () => {
    setQueryResult(runQuery(queryType, queryId, idxMode));
  };

  const resetQuery = () => setQueryResult(null);

  return (
    <div className="concept-layout">
      <div className="concept-main">
        <div className="concept-center">
          <div className="concept-visual" style={{ alignItems: "flex-start", overflow: "auto" }}>
            <div className="sh-wrap">
              {phase === "idle" && (
                <div className="sh-empty-state">
                  <div className="sh-empty-title">Time-Based Sharding</div>
                  <div className="sh-empty-sub">
                    Sharding splits a large table across multiple independent databases (shards).
                    Each shard holds a subset of rows. Load the sample data to see how this works.
                  </div>
                  <button
                    className="concept-btn accent"
                    onClick={() => setPhase("loaded")}
                  >
                    Load Sample Data
                  </button>
                </div>
              )}

              {phase === "loaded" && (
                <>
                  <div className="sh-table-wrap">
                    <div className="sh-table-head-row">
                      <div className="sh-table-title">orders</div>
                      <div className="sh-table-count">{ORDERS.length} rows</div>
                    </div>
                    <table className="sh-table">
                      <thead>
                        <tr>
                          <th>id</th>
                          <th>date</th>
                          <th>customer</th>
                          <th>amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ORDERS.map((o) => (
                          <tr key={o.id}>
                            <td>{o.id}</td>
                            <td>{o.date}</td>
                            <td>{o.customer}</td>
                            <td>${o.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="step-controls">
                    <button
                      className="concept-btn accent"
                      onClick={() => setPhase("partitioned")}
                    >
                      Partition by Time Range
                    </button>
                  </div>
                </>
              )}

              {phase === "partitioned" && (
                <>
                  <div className="sh-shards">
                    {SHARDS.map((sh) => {
                      const accessed = queryResult?.accessedShards.includes(sh.id);
                      const pruned = queryResult?.prunedShards.includes(sh.id);
                      return (
                        <div
                          key={sh.id}
                          className={[
                            "sh-shard",
                            accessed ? "sh-shard-accessed" : "",
                            pruned ? "sh-shard-pruned" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{ borderColor: accessed ? sh.color : undefined }}
                        >
                          <div
                            className="sh-shard-head"
                            style={{ background: accessed ? sh.color + "18" : undefined }}
                          >
                            <span
                              className="sh-shard-label"
                              style={{ color: sh.color }}
                            >
                              {sh.label}
                            </span>
                            <span className="sh-shard-range">{sh.range}</span>
                            {pruned && (
                              <span className="sh-pruned-badge">PRUNED</span>
                            )}
                          </div>
                          <div className="sh-shard-rows">
                            {shardRows[sh.id].map((o) => (
                              <div key={o.id} className="sh-shard-row">
                                <span className="sh-row-id">#{o.id}</span>
                                <span className="sh-row-date">{o.date}</span>
                                <span className="sh-row-customer">{o.customer}</span>
                                <span className="sh-row-amount">${o.amount}</span>
                              </div>
                            ))}
                          </div>

                          {idxMode === "local" && (
                            <div className="sh-local-idx">
                              <div className="sh-local-idx-head">Local Index (id)</div>
                              {shardRows[sh.id].map((o) => (
                                <div key={o.id} className="sh-local-idx-entry">
                                  <span className="sh-idx-key">key={o.id}</span>
                                  <span className="sh-idx-arr">→</span>
                                  <span className="sh-idx-ptr">row {o.id % 4}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {idxMode === "global" && (
                    <div className="sh-global-idx">
                      <div className="sh-global-idx-head">Global Index (id), spans all shards</div>
                      <div className="sh-global-idx-entries">
                        {ORDERS.map((o) => (
                          <div key={o.id} className="sh-global-idx-entry">
                            <span className="sh-idx-key">key={o.id}</span>
                            <span className="sh-idx-arr">→</span>
                            <span className="sh-idx-ptr">
                              Shard {getShard(o.date)}, row {o.id % 4}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sh-controls">
                    <div className="sh-picker-row">
                      <span className="sh-picker-label">Index type:</span>
                      <div className="sh-mode-picker">
                        {(["global", "local"] as IdxMode[]).map((m) => (
                          <button
                            key={m}
                            className={`sh-mode-btn${idxMode === m ? " active" : ""}`}
                            onClick={() => { setIdxMode(m); resetQuery(); }}
                          >
                            {m === "global" ? "Global Index" : "Local Index"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sh-picker-row">
                      <span className="sh-picker-label">Query:</span>
                      <div className="sh-mode-picker">
                        <button
                          className={`sh-mode-btn${queryType === "id" ? " active" : ""}`}
                          onClick={() => { setQueryType("id"); resetQuery(); }}
                        >
                          Find by id
                        </button>
                        <button
                          className={`sh-mode-btn${queryType === "daterange" ? " active" : ""}`}
                          onClick={() => { setQueryType("daterange"); resetQuery(); }}
                        >
                          Date range (Jan 1–15)
                        </button>
                      </div>
                      {queryType === "id" && (
                        <select
                          className="sh-id-select"
                          value={queryId}
                          onChange={(e) => { setQueryId(Number(e.target.value)); resetQuery(); }}
                        >
                          {ORDERS.map((o) => (
                            <option key={o.id} value={o.id}>
                              id = {o.id} ({o.customer})
                            </option>
                          ))}
                        </select>
                      )}
                      <button className="concept-btn accent" onClick={handleRunQuery}>
                        Run Query
                      </button>
                    </div>
                  </div>

                  {queryResult && (
                    <div className="sh-result-box">
                      <div className="sh-result-steps">
                        {queryResult.steps.map((step, i) => (
                          <div key={i} className="sh-result-step">
                            <span className="sh-step-num">{i + 1}</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                      <div className="sh-result-summary">{queryResult.result}</div>
                    </div>
                  )}
                </>
              )}
              <div className="rl-sql-section">
                <div className="rl-sql-label">SQL reference</div>
                <pre className="rl-sql-block">{shardSQL()}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="concept-sidebar">
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What is Sharding?</div>
            <p>
              Sharding (also called horizontal partitioning) splits one large table across multiple
              independent databases, called shards. Each shard holds a different subset of rows.
              No single machine needs to hold all the data.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What is a Shard Key?</div>
            <p>
              The shard key is the column used to decide which shard a row belongs to. Here,
              the shard key is <code>date</code>, rows from Jan–Mar go to Shard 1, Apr–Jun to Shard 2, and so on.
              Choosing a good shard key is critical, a bad key causes some shards to be much larger than others
              (called hot spots).
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Shard Pruning</div>
            <p>
              When a query filters on the shard key, the coordinator can skip shards that cannot possibly
              contain matching rows. This is called shard pruning. A date range query on a date-sharded table
              only touches the relevant shards, everything else is ignored completely.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">Global vs Local Index</div>
            <p>
              A <strong>global index</strong> spans all shards, it maps any key directly to the shard and
              row that holds it. Fast for non-shard-key lookups, but the index itself must be maintained
              across shards on every write.
            </p>
            <p style={{ marginTop: 6 }}>
              A <strong>local index</strong> lives on each shard independently and only covers rows in that shard.
              Simpler to maintain, but a query on a non-shard key must be sent to all shards, they all search
              their local index in parallel.
            </p>
          </div>
          <div className="concept-sidebar-section">
            <div className="concept-sidebar-label">What is a Coordinator?</div>
            <p>
              The coordinator is a routing layer that receives queries from your application, decides which
              shards to contact (using shard ranges and indexes), fans out the query, collects results, and
              merges them before returning to the client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
