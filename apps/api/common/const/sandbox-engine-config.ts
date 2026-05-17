import { SupportedEngine } from "@common/enums/engine";
import type { EngineDockerConfig } from "@common/types/sandbox-engine-config";

export const sandboxEngineConfigMap: Partial<
  Record<SupportedEngine, EngineDockerConfig>
> = {
  [SupportedEngine.POSTGRESQL]: {
    image: "postgres:16-alpine",
    containerPort: 5432,
    database: "querify",
    username: "querify",
    memory: "256m",
    cpus: "0.25",
  },
  [SupportedEngine.MYSQL]: {
    image: "mysql:8.4",
    containerPort: 3306,
    database: "querify",
    username: "querify",
    memory: "512m",
    cpus: "0.5",
    extraArgs: [
      "--skip-log-bin",
      "--performance_schema=OFF",
      "--innodb_buffer_pool_size=16M",
      "--skip-name-resolve",
    ],
  },
  [SupportedEngine.MONGODB]: {
    image: "mongo:7",
    containerPort: 27017,
    database: "querify",
    username: "querify",
    memory: "1g",
    cpus: "1.0",
  },
};
