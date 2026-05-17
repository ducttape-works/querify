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
  [SupportedEngine.MONGODB]: (payload: SandboxQuery) => [
    payload.instanceId,
    "mongosh",
    "--quiet",
    "--json=relaxed",
    "--host", "127.0.0.1",
    "--port", "27017",
    "-u", payload.username,
    "-p", payload.password,
    "--authenticationDatabase", payload.database,
    payload.database,
    "--eval", `var r = ${payload.query}; r?.toArray ? r.toArray() : r`
  ],
  [SupportedEngine.CLICKHOUSE]: (payload: SandboxQuery) => [
    payload.instanceId,
    "clickhouse-client",
    "--user", payload.username,
    "--password", payload.password,
    "--database", payload.database,
    "--format", "TabSeparatedWithNames",
    "--query", payload.query,
  ],
};
