import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("sandbox_sessions", (t) => {
    t.string("id").primary();
    t.string("user_id").notNullable().references("id").inTable("users");
    t.string("engine").notNullable();
    t.string("status").notNullable().defaultTo("spawning");
    t.string("instance_id").nullable();
    t.timestamp("ended_at").nullable();
    t.timestamp("created_at").notNullable();
    t.timestamp("updated_at").notNullable();
    t.timestamp("deleted_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("sandbox_sessions");
}
