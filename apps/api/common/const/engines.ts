import { SupportEngine } from "@common/types/engines";

export const dbEngines: SupportEngine[] = [
  {
    name: "postgresql",
    description: "PostgreSQL is a powerful, open source object-relational database system.",
    color: "#336791",
    is_supported: true,
    is_default: false,
  },
  {
    name: "mysql",
    description: "MySQL is an open-source relational database management system.",
    color: "#E48A00",
    is_supported: true,
    is_default: false,
  },
  {
    name: "sqlite",
    description: "SQLite is a C library that provides a lightweight disk-based database.",
    color: "#003B57",
    is_supported: true,
    is_default: true,
  },
  {
    name: "mongodb",
    description: "MongoDB is a document-oriented NoSQL database for high volume data storage.",
    color: "#47A248",
    is_supported: true,
    is_default: false,
  },
  {
    name: "cassandra",
    description: "Apache Cassandra is a wide-column store designed for high availability and linear scalability.",
    color: "#1287B1",
    is_supported: false,
    is_default: false,
  },
  {
    name: "neo4j",
    description: "Neo4j is a graph database management system for highly connected data.",
    color: "#018BFF",
    is_supported: false,
    is_default: false,
  },
  {
    name: "clickhouse",
    description: "ClickHouse is a columnar OLAP database for real-time analytics at scale.",
    color: "#FFCC01",
    is_supported: true,
    is_default: false,
  },
] as const;
