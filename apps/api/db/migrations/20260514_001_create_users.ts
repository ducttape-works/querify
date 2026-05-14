import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (t) => {
    t.string("id").primary();
    t.string("fingerprint").notNullable().unique();
    t.timestamp("last_seen_at").notNullable();
    t.timestamp("created_at").notNullable();
    t.timestamp("updated_at").notNullable();
    t.timestamp("deleted_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("users");
}
