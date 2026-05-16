import dayjs from "dayjs";
import cron, { type ScheduledTask } from "node-cron";
import { singleton } from "tsyringe";

import { SandboxProvider, SandboxStatus } from "@common/enums/sandbox";
import { SandboxProviderFactory } from "@modules/sandbox/providers";
import { SandboxSessionRepository } from "@repositories/sandbox-session.repository";

@singleton()
export class SessionsCleanupWorker {
  private task: ScheduledTask | null = null;

  private readonly sessionMaxAgeMs = 60 * 60 * 1000;

  constructor(
    private readonly sandboxSessionRepository: SandboxSessionRepository,
    private readonly sandboxProviderFactory: SandboxProviderFactory,
  ) {}

  public start() {
    if (this.task) return;

    this.task = cron.schedule("* * * * *", () => {
      this.run().catch((error) => {
        console.error({ err: error }, "Failed to clean up expired sessions");
      });
    });
  }

  public stop() {
    if (!this.task) return;

    this.task.stop();
    this.task.destroy();
    this.task = null;
  }

  public async run() {
    const expiredSessions =
      await this.sandboxSessionRepository.getExpiredActiveSessions(
        this.sessionMaxAgeMs,
      );

    for (const session of expiredSessions) {
      try {
        if (session.instance_id && session.provider) {
          const sandboxProvider = this.sandboxProviderFactory.createByName(
            session.provider as SandboxProvider,
          );

          await sandboxProvider.down(session.instance_id);
        }

        await this.sandboxSessionRepository.update(
          { id: session.id },
          {
            status: SandboxStatus.STOPPED,
            ended_at: dayjs().toISOString(),
          },
        );
      } catch (error) {
        console.error(
          {
            err: error,
            sessionId: session.id,
          },
          "Failed to stop expired session",
        );
      }
    }
  }
}
