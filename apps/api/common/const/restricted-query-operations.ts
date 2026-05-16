import { SupportedEngine } from "@common/enums/engine";

export const restrictedQueryOperations = {
  [SupportedEngine.POSTGRESQL]: [
    "pg_read_file",
    "pg_read_binary_file",
    "pg_ls_dir",
    "pg_stat_file",
    "lo_import",
    "lo_export",
    "create extension",
    "alter system",
    "create role",
    "alter role",
    "drop role",
    "create user",
    "alter user",
    "drop user",
    "create database",
    "alter database",
    "drop database",
    "grant ",
    "revoke ",
    "\\",
  ],
};
