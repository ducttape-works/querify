import { injectable } from "tsyringe";

import { BadRequestError } from "@common/utils/errors/app.error";
import { dbEngines } from "@common/const/engines";
import { SandboxStatus } from "@common/enums/sandbox";
import { SandboxSessionRepository, UserRepository } from "@repositories/index";

@injectable()
export class SessionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sandboxSessionRepository: SandboxSessionRepository,
  ) {}

  public async createSession(anonymousId: string, engine: string) {
    const supportedEngine = dbEngines.find(
      (_engine) => _engine.name === engine && _engine.is_supported,
    );

    if (!supportedEngine) throw new BadRequestError("Unsupported engine");

    if (engine === "sqlite") throw new BadRequestError("SQLite runs via wasm");

    const user =
      await this.userRepository.findOrCreateByFingerprint(anonymousId);

    const activeSession =
      await this.sandboxSessionRepository.getActiveSessionForUser(user.id);

    if (activeSession) {
      return {
        status: true,
        message: "Active session already exists.",
        data: {
          id: activeSession.id,
          engine: activeSession.engine,
          status: activeSession.status,
        },
      };
    }

    const session = await this.sandboxSessionRepository.create({
      user_id: user.id,
      engine,
      status: SandboxStatus.SPAWNING,
      instance_id: null,
      ended_at: null,
    });

    // Emit event to spawn the sandbox session

    return {
      status: true,
      message: "Session is being prepared.",
      data: {
        id: session.id,
        engine: session.engine,
        status: session.status,
      },
    };
  }
}
