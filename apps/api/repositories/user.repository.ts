import { injectable } from "tsyringe";

import BaseRepository from "./base.repository";
import { User, UserModelType } from "@models/user.model";

@injectable()
export class UserRepository extends BaseRepository<UserModelType, User> {
  constructor() {
    super(User);
  }

  public async findByFingerprint(fingerprint: string) {
    return await this.model.query().where({ fingerprint }).whereNull("deleted_at").first();
  }
}
