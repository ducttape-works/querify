import dayjs from "dayjs";
import { Model } from "objection";
import { ulid } from "ulid";

export default abstract class BaseModel extends Model {
  id!: string;
  created_at!: string;
  updated_at!: string;
  deleted_at!: string | null;

  static get idColumn() {
    return "id";
  }

  $beforeInsert() {
    if (!this.id) this.id = ulid();
    this.created_at = dayjs().toISOString();
    this.updated_at = dayjs().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = dayjs().toISOString();
  }
}
