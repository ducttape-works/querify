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
};
