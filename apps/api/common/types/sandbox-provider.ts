import { SupportedEngine } from "@common/enums/engine";
import { SandboxProvider as SandboxProviderName } from "@common/enums/sandbox";

export type SandboxProvisionInput = {
  sessionId: string;
  engine: SupportedEngine;
};

export type SandboxRuntime = {
  instanceId: string;
  provider: SandboxProviderName;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export interface SandboxProvider {
  up(payload: SandboxProvisionInput): Promise<SandboxRuntime>;
  down(instanceId: string): Promise<void>;
}
