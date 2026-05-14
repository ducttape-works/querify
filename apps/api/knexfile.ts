import type { Knex } from "knex";

import { db } from "./configs/env";

const config: Knex.Config = {
  client: "better-sqlite3",
  connection: {
    filename: db.path,
  },
  useNullAsDefault: true,
  migrations: {
    directory: "./db/migrations",
    extension: "ts",
    loadExtensions: [".ts"],
  },
};

export = config;
