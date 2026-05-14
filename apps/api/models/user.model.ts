import { ModelObject } from "objection";
import { injectable } from "tsyringe";

import BaseModel from "./base.model";

@injectable()
export class User extends BaseModel {
  static tableName = "users";

  fingerprint!: string;
  last_seen_at!: string;
}

export type UserModelType = ModelObject<User>;
