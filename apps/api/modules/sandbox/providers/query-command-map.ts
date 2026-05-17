import { SupportedEngine } from "@common/enums/engine";
import type { SandboxQuery } from "@common/types/sandbox-provider";

export const sandboxQueryCommandMap = {
  [SupportedEngine.POSTGRESQL]: (payload: SandboxQuery) => [
    payload.instanceId,
    "psql",
    "-X", "-v", "ON_ERROR_STOP=1",
    "-P", "footer=off",
    "-P", "null=\\N",
    "-A", "-F", "\t",
    "-U", payload.username,
    "-d", payload.database,
    "-c", payload.query,
  ],
  [SupportedEngine.MYSQL]: (payload: SandboxQuery) => [
    "-e", `MYSQL_PWD=${payload.password}`,
    payload.instanceId,
    "mysql",
    "--batch", "--raw", "--silent",
    "-h", "127.0.0.1",
    "-u", payload.username,
    `--database=${payload.database}`,
    "-e", payload.query,
  ],
};
