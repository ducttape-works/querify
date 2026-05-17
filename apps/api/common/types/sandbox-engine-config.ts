export type EngineDockerConfig = {
  image: string;
  containerPort: number;
  database: string;
  username: string;
  memory: string;
  cpus: string;
  extraArgs?: string[];
};
