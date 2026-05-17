import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

import { queries } from "../sql/sqlite";
import type { CellValue } from "../types/sqlite";

const sqlite = initSqlJs({
  locateFile: () => sqlWasmUrl,
});

export const createSqliteDb = async () => {
  const SQL = await sqlite;
  const db = new SQL.Database();
  db.run(queries.seed);
  return db;
};

export const formatCell = (value: CellValue) => {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `blob(${value.length})`;
  return String(value);
};

export const getTables = (db: Database) => {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
  );

  return result[0]?.values.map(([name]) => ({
      name: name as string,
      columns: [],
    })) ?? [];
};
