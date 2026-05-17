import { SupportedEngine } from "@common/enums/engine";
import type { OutputParser } from "@common/types/sandbox-provider";

const parseTabOutput: OutputParser = (stdout, elapsedMs) => {
  const raw = stdout.trimEnd();

  if (!raw) {
    return {
      columns: [],
      rows: [],
      message: "Query executed successfully",
      elapsedMs,
    };
  }

  const lines = raw.split("\n");

  if (lines.length === 1 && !lines[0].includes("\t")) {
    return { columns: [], rows: [], message: lines[0].trim(), elapsedMs };
  }

  const columns = lines[0].split("\t");

  const rows = lines.slice(1).map((line) =>
    line.split("\t").map((cell) => {
      if (cell === "\\N" || cell === "NULL") return null;
      return cell;
    }),
  );

  return {
    columns,
    rows,
    message: `${rows.length} row${rows.length === 1 ? "" : "s"} returned`,
    elapsedMs,
  };
};

const parseMongoOutput: OutputParser = (stdout, elapsedMs) => {
  const raw = stdout.trim();

  if (!raw) {
    return { columns: [], rows: [], message: "ok", elapsedMs };
  }

  const parsed = JSON.parse(raw) as unknown;

  console.log("parseMongo result ===>", parsed);

  if (Array.isArray(parsed)) {
    if (!parsed.length) {
      return { columns: [], rows: [], message: "0 documents", elapsedMs };
    }

    if (typeof parsed[0] === "string") {
      return {
        columns: ["name"],
        rows: parsed.map((value) => [String(value)]),
        message: `${parsed.length} collections`,
        elapsedMs,
      };
    }

    const columns = Object.keys(parsed[0] as Record<string, unknown>);
    const rows = parsed.map((value) =>
      columns.map((column) => {
        const cell = (value as Record<string, unknown>)[column];

        if (cell == null) return null;
        if (typeof cell === "object") return JSON.stringify(cell);

        return String(cell);
      }),
    );

    return {
      columns,
      rows,
      message: `${rows.length} document${rows.length === 1 ? "" : "s"}`,
      elapsedMs,
    };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const document = parsed as Record<string, unknown>;
    const columns = Object.keys(document);
    const row = columns.map((column) => {
      const cell = document[column];

      if (cell == null) return null;
      if (typeof cell === "object") return JSON.stringify(cell);

      return String(cell);
    });

    return {
      columns,
      rows: [row],
      message: "ok",
      elapsedMs,
    };
  }

  return {
    columns: [],
    rows: [],
    message: raw,
    elapsedMs,
  };
};

export const sandboxOutputParserMap = {
  [SupportedEngine.POSTGRESQL]: parseTabOutput,
  [SupportedEngine.MYSQL]: parseTabOutput,
  [SupportedEngine.MONGODB]: parseMongoOutput,
  [SupportedEngine.CLICKHOUSE]: parseTabOutput,
};
