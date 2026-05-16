import { SupportedEngine } from "@common/enums/engine";
import type { SandboxQuery } from "@common/types/sandbox-provider";

export const sandboxQueryCommandMap = {
  [SupportedEngine.POSTGRESQL]: (payload: SandboxQuery) => [
    "psql",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-P",
    "footer=off",
    "-A",
    "-F",
    "\t",
    "-U",
    payload.username,
    "-d",
    payload.database,
    "-c",
    payload.query,
  ],
};
