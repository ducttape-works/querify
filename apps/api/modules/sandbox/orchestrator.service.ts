import { injectable } from "tsyringe";
import { StatusCodes } from "http-status-codes";

import { SpawnProviderConfig } from "@common/types/any";
import AppError from "@common/utils/errors/base.error";
import type { SandboxRuntime } from "@common/types/sandbox-provider";
import { SandboxProviderFactory } from "./providers";
import { SupportedEngine } from "@common/enums/engine";

@injectable()
export class OrchestratorService {
  constructor(
    private readonly sandboxProviderFactory: SandboxProviderFactory,
  ) {}

  public async spawn(
    _engine: SupportedEngine,
    _config: SpawnProviderConfig,
  ): Promise<SandboxRuntime> {
    try {
      const sandboxProvider = this.sandboxProviderFactory.create();

      return await sandboxProvider.up({
        sessionId: _config.sid,
        engine: _engine,
      });
    } catch {
      throw new AppError(
        "Failed to spawn sandbox instance.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
