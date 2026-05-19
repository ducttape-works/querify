import { injectable } from "tsyringe";

import { app } from "@configs/env";
import { Environment } from "@common/enums/any";
import { SandboxProvider as SandboxProviderName } from "@common/enums/sandbox";
import { DockerSandboxProvider } from "./docker";
import { FirecrackerSandboxProvider } from "./firecracker";

@injectable()
export class SandboxProviderFactory {
  constructor(
    private readonly docker: DockerSandboxProvider,
    private readonly firecracker: FirecrackerSandboxProvider,
  ) {}

  create() {
    switch (app.environment) {
      case Environment.DEVELOPMENT:
      case Environment.PRODUCTION:
        return this.docker;
      case Environment.LOCAL:
        return this.firecracker;
      default:
        return this.docker;
    }
  }

  createByName(provider: SandboxProviderName) {
    switch (provider) {
      case SandboxProviderName.DOCKER:
        return this.docker;
      case SandboxProviderName.FIRECRACKER:
        return this.firecracker;
      default:
        return this.docker;
    }
  }
}
