import "./App.css";

// @Oluwatunmise-olat replace with backend data once ready
const SCHEMA_TABLES = ["users", "orders", "products", "reviews", "categories"];

export default function App() {
  return (
    <div style={styles.root}>
      <Topbar />
      <div style={styles.body}>
        <Sidebar />
        <EditorPane />
        <OutputPane />
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header style={styles.topbar}>
      <div style={styles.topbarLeft}>
        <span style={styles.logo}>Querify</span>
        <div style={styles.engineBadge}>
          <span style={{ ...styles.engineDot, background: "#336791" }} />
          <span style={styles.engineLabel}>PostgreSQL</span>
          <span style={styles.chevron}>▾</span>
        </div>
        <div style={styles.datasetBadge}>
          interview-prep
          <span style={styles.chevron}>▾</span>
        </div>
      </div>
      <div style={styles.topbarRight}>
        <button style={styles.runBtn}>
          Run
          <kbd style={styles.kbd}>⌘↵</kbd>
        </button>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>Schema</div>
      <ul style={styles.tableList}>
        {SCHEMA_TABLES.map((table) => (
          <li key={table} style={styles.tableItem}>
            <span style={styles.tableIcon}>▤</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
              {table}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EditorPane() {
  return (
    <div style={styles.editorPane}>
      <div style={styles.paneHeader}>
        <span style={styles.paneTab}>query.sql</span>
      </div>
      <div style={styles.editorArea}>
        <pre style={styles.editorPlaceholder}>{`-- Monaco editor loads here
SELECT * FROM users LIMIT 10;`}</pre>
      </div>
    </div>
  );
}

function OutputPane() {
  return (
    <div style={styles.outputPane}>
      <div style={styles.paneHeader}>
        <span style={styles.paneTab}>Results</span>
        <span
          style={{
            ...styles.paneTab,
            color: "var(--text-muted)",
            fontWeight: 400,
          }}
        >
          Visualizer
        </span>
        <span
          style={{
            ...styles.paneTab,
            color: "var(--text-muted)",
            fontWeight: 400,
          }}
        >
          Concepts
        </span>
      </div>
      <div style={styles.emptyOutput}>
        <span style={styles.emptyText}>Run a query to see results</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
  },

  topbar: {
    height: 48,
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.02em",
    color: "var(--text)",
    marginRight: 4,
  },
  engineBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "var(--mono)",
  },
  engineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  engineLabel: {
    color: "var(--text)",
  },
  datasetBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    color: "var(--text-muted)",
  },
  chevron: {
    fontSize: 10,
    color: "var(--text-muted)",
  },
  runBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    background: "var(--accent)",
    color: "var(--accent-text)",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "var(--sans)",
  },
  kbd: {
    fontSize: 11,
    fontFamily: "var(--mono)",
    opacity: 0.7,
    background: "transparent",
    border: "none",
    color: "inherit",
  },

  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },

  sidebar: {
    width: 220,
    minWidth: 220,
    background: "var(--surface-2)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    borderBottom: "1px dashed var(--border)",
  },
  tableList: {
    listStyle: "none",
    overflowY: "auto",
  },
  tableItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderBottom: "1px dashed var(--border)",
    cursor: "pointer",
    color: "var(--text)",
    fontSize: 13,
  },
  tableIcon: {
    color: "var(--text-muted)",
    fontSize: 12,
  },

  editorPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid var(--border)",
    overflow: "hidden",
  },
  outputPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  paneHeader: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "0 12px",
    height: 36,
    minHeight: 36,
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
  },
  paneTab: {
    padding: "0 8px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text)",
    cursor: "pointer",
    fontFamily: "var(--mono)",
  },
  editorArea: {
    flex: 1,
    background: "var(--surface)",
    overflow: "auto",
    padding: 16,
  },
  editorPlaceholder: {
    fontFamily: "var(--mono)",
    fontSize: 13,
    lineHeight: 1.6,
    color: "var(--text-muted)",
  },
  emptyOutput: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface)",
    backgroundImage:
      "repeating-linear-gradient(135deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 12px)",
    backgroundSize: "12px 12px",
  },
  emptyText: {
    fontSize: 13,
    color: "var(--text-muted)",
    background: "var(--surface)",
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid var(--border)",
  },
};
