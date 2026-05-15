import { injectable } from "tsyringe";
import dayjs from "dayjs";

import BaseRepository from "./base.repository";
import { User, UserModelType } from "@models/user.model";

@injectable()
export class UserRepository extends BaseRepository<UserModelType, User> {
  constructor() {
    super(User);
  }

  public async findByFingerprint(fingerprint: string) {
    return await this.model
      .query()
      .where({ fingerprint })
      .whereNull("deleted_at")
      .first();
  }

  public async findOrCreateByFingerprint(fingerprint: string) {
    const existingUser = await this.findByFingerprint(fingerprint);

    if (existingUser) {
      await this.update(
        { id: existingUser.id },
        { last_seen_at: dayjs().toISOString() },
      );

      return existingUser;
    }

    return await this.create({
      fingerprint,
      last_seen_at: dayjs().toISOString(),
    });
  }
}
