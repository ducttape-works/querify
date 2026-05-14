export type CellValue = string | number | Uint8Array | null;

export type QueryResultState = {
  columns: string[];
  rows: CellValue[][];
  message: string;
  elapsedMs: number;
};
