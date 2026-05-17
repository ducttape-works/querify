import { SupportedEngine } from "@common/enums/engine";
import { SandboxProvider as SandboxProviderName } from "@common/enums/sandbox";

export type SandboxProvisionInput = {
  sessionId: string;
  engine: SupportedEngine;
};

export type SandboxRuntime = {
  instanceId: string;
  provider: SandboxProviderName;
  host: string | null;
  port: number | null;
  database: string;
  username: string;
  password: string;
};

export type SandboxQuery = {
  query: string;
  engine: SupportedEngine;
} & Pick<SandboxRuntime, "instanceId" | "database" | "username" | "password">;

export type SandboxExecutionResult = {
  stdout: string;
  stderr: string;
};

export type ParsedQueryOutput = {
  columns: string[];
  rows: (string | null)[][];
  message: string;
  elapsedMs: number;
};

export interface SandboxProvider {
  up(payload: SandboxProvisionInput): Promise<SandboxRuntime>;
  down(instanceId: string): Promise<void>;
  execute(payload: SandboxQuery): Promise<SandboxExecutionResult>;
}
