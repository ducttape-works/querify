import { ModelObject, RelationMappingsThunk } from "objection";
import { injectable } from "tsyringe";

import BaseModel from "./base.model";
import { User } from "./user.model";
import { SandboxProvider, SandboxStatus } from "@common/enums/sandbox";

@injectable()
export class SandboxSession extends BaseModel {
  static tableName = "sandbox_sessions";

  user_id!: string;
  engine!: string;
  status!: SandboxStatus;
  instance_id!: string | null;
  provider!: SandboxProvider | null;
  host!: string | null;
  port!: number | null;
  database!: string | null;
  username!: string | null;
  password_ciphertext!: string | null;
  ended_at!: string | null;

  user!: User;

  static relationMappings: RelationMappingsThunk = () => ({
    user: {
      modelClass: User,
      relation: BaseModel.BelongsToOneRelation,
      join: { from: "sandbox_sessions.user_id", to: "users.id" },
    },
  });
}

export type SandboxSessionModelType = ModelObject<SandboxSession>;
