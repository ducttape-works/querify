import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sandbox_sessions", (t) => {
    t.string("provider").nullable();
    t.string("host").nullable();
    t.integer("port").nullable();
    t.string("database").nullable();
    t.string("username").nullable();
    t.text("password_ciphertext").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sandbox_sessions", (t) => {
    t.dropColumn("provider");
    t.dropColumn("host");
    t.dropColumn("port");
    t.dropColumn("database");
    t.dropColumn("username");
    t.dropColumn("password_ciphertext");
  });
}
