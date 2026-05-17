export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Engine = {
  name: string;
  description: string;
  color: string;
  is_supported: boolean;
  is_default: boolean;
};

export type SessionStatus =
  | "spawning"
  | "ready"
  | "running"
  | "stopped"
  | "error";

export type Session = {
  id: string;
  engine: string;
  status: SessionStatus;
  message?: string;
};

export type SchemaTable = {
  name: string;
  columns: { name: string; type: string }[];
};

export type SessionSchema = {
  tables: SchemaTable[];
};

export type BTreeConceptState = {
  keys: number[];
};
