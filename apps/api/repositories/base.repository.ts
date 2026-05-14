import dayjs from "dayjs";
import {
  ModelClass,
  QueryBuilderType,
  SingleQueryBuilder,
  Transaction,
} from "objection";

import BaseModel from "@models/base.model";

export default abstract class BaseRepository<T, M extends BaseModel> {
  protected model: ModelClass<M>;
  public tableName: string;

  constructor(model: ModelClass<M>) {
    this.model = model;
    this.tableName = model.tableName;
  }

  public async create(
    payload: Partial<T>,
    trx?: Transaction,
  ): Promise<SingleQueryBuilder<QueryBuilderType<M>>> {
    return await this.model.query(trx).insert(payload);
  }

  public async getById(id: string, trx?: Transaction) {
    return await this.model.query(trx).where({ id }).whereNull("deleted_at").first();
  }

  public async findOne(query: Partial<T>, trx?: Transaction) {
    return await this.model.query(trx).where(query).whereNull("deleted_at").first();
  }

  public async findMany(query: Partial<T>, trx?: Transaction) {
    return await this.model.query(trx).where(query).whereNull("deleted_at").orderBy("created_at", "desc");
  }

  public async count(query: Partial<T>, trx?: Transaction) {
    return this.model.query(trx).where(query).count("* as count").first() as unknown as { count: number };
  }

  public async update(query: Partial<T>, payload: Partial<T>, trx?: Transaction): Promise<void> {
    await this.model.query(trx).where(query).update(payload);
  }

  public async delete(query: Partial<T>, soft = true, trx?: Transaction): Promise<void> {
    if (!soft) {
      await this.model.query(trx).where(query).delete();
    } else {
      await this.model.query(trx).where(query).update({ deleted_at: dayjs().toISOString() });
    }
  }

  public query(trx?: Transaction) {
    return this.model.query(trx);
  }
}
