import { injectable } from "tsyringe";

import { app } from "@configs/env";
import { Environment } from "@common/enums/any";
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
        return this.docker;
      case Environment.PRODUCTION:
        return this.firecracker;
      default:
        return this.docker;
    }
  }
}
