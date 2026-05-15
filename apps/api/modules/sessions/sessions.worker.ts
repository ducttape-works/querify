import { singleton } from "tsyringe";

import { SessionEventBus } from "@common/events/session-event-bus";
import { EncryptionService } from "@common/services/encryption.service";
import { SandboxStatus } from "@common/enums/sandbox";
import { SandboxSessionRepository } from "@repositories/sandbox-session.repository";
import { OrchestratorService } from "@modules/sandbox/orchestrator.service";
import { SupportedEngine } from "@common/enums/engine";

@singleton()
export class SessionsWorker {
  private started = false;

  constructor(
    private readonly sessionEventBus: SessionEventBus,
    private readonly encryptionService: EncryptionService,
    private readonly sandboxSessionRepository: SandboxSessionRepository,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  public start() {
    if (this.started) return;

    this.started = true;

    this.sessionEventBus.onSpawnRequested(async (event) => {
      if (event.type !== "session.spawn.requested") return;

      try {
        const runtime = await this.orchestratorService.spawn(
          event.data.engine as SupportedEngine,
          { sid: event.data.sessionId },
        );

        await this.sandboxSessionRepository.update(
          { id: event.data.sessionId },
          {
            status: SandboxStatus.READY,
            instance_id: runtime.instanceId,
            provider: runtime.provider,
            host: runtime.host,
            port: runtime.port,
            database: runtime.database,
            username: runtime.username,
            password_ciphertext: this.encryptionService.encrypt(
              runtime.password,
            ),
          },
        );

        this.sessionEventBus.publish({
          type: "session.ready",
          data: {
            sessionId: event.data.sessionId,
            engine: event.data.engine as SupportedEngine,
            status: SandboxStatus.READY,
          },
        });
      } catch (error) {
        console.error(
          {
            err: error,
            sessionId: event.data.sessionId,
            engine: event.data.engine,
          },
          "Failed to prepare sandbox session",
        );

        await this.sandboxSessionRepository.update(
          { id: event.data.sessionId },
          {
            status: SandboxStatus.ERROR,
          },
        );

        this.sessionEventBus.publish({
          type: "session.error",
          data: {
            sessionId: event.data.sessionId,
            engine: event.data.engine,
            status: SandboxStatus.ERROR,
            message:
              error instanceof Error
                ? error.message
                : "Failed to prepare sandbox session.",
          },
        });
      }
    });
  }
}
