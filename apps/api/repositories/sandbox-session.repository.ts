import { injectable } from "tsyringe";

import BaseRepository from "./base.repository";
import { SandboxSession, SandboxSessionModelType } from "@models/sandbox-session.model";

@injectable()
export class SandboxSessionRepository extends BaseRepository<SandboxSessionModelType, SandboxSession> {
  constructor() {
    super(SandboxSession);
  }

  public async getActiveSessionForUser(user_id: string) {
    return await this.model
      .query()
      .where({ user_id })
      .whereIn("status", ["spawning", "ready", "running"])
      .whereNull("deleted_at")
      .first();
  }
}
