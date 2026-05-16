import { SupportedEngine } from "@common/enums/engine";
import type { ParsedQueryOutput } from "@common/types/sandbox-provider";

type OutputParser = (stdout: string, elapsedMs: number) => ParsedQueryOutput;

const parsePsql: OutputParser = (stdout, elapsedMs) => {
  const raw = stdout.trimEnd();

  console.log("raw stdout ====>>", JSON.stringify(raw));

  if (!raw) {
    return {
      columns: [],
      rows: [],
      message: "Query executed successfully",
      elapsedMs,
    };
  }

  const lines = raw.split("\n");

  // For INSERT 0 1, UPDATE 2, CREATE TABLE
  if (lines.length === 1 && !lines[0].includes("\t")) {
    return { columns: [], rows: [], message: lines[0].trim(), elapsedMs };
  }

  const columns = lines[0].split("\t");

  const rows = lines
    .slice(1)
    .map((line) =>
      line.split("\t").map((cell) => (cell === "\\N" ? null : cell)),
    );

  return {
    columns,
    rows,
    message: `${rows.length} row${rows.length === 1 ? "" : "s"} returned`,
    elapsedMs,
  };
};

export const sandboxOutputParserMap = {
  [SupportedEngine.POSTGRESQL]: parsePsql,
};
