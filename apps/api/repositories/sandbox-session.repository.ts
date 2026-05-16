import { injectable } from "tsyringe";
import dayjs from "dayjs";

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

  public async getByIdForUser(id: string, user_id: string) {
    return await this.model
      .query()
      .where({ id, user_id })
      .whereNull("deleted_at")
      .first();
  }

  public async getExpiredActiveSessions(maxAgeMs: number) {
    return await this.model
      .query()
      .whereIn("status", ["spawning", "ready", "running"])
      .where("created_at", "<", dayjs().subtract(maxAgeMs, "millisecond").toISOString())
      .whereNull("deleted_at");
  }
}
