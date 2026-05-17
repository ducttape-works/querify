import { SupportedEngine } from "@common/enums/engine";

export const sandboxSchemaQueryMap = {
  [SupportedEngine.POSTGRESQL]:
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
  [SupportedEngine.MYSQL]:
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name;",
};
