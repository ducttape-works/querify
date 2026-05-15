export enum SandboxStatus {
  SPAWNING = "spawning",
  READY = "ready",
  RUNNING = "running",
  STOPPED = "stopped",
  ERROR = "error",
}

export enum SandboxProvider {
  DOCKER = "docker",
  FIRECRACKER = "firecracker",
}
