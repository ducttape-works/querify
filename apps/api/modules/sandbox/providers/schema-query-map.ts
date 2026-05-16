import { SupportedEngine } from "@common/enums/engine";

export const sandboxSchemaQueryMap = {
  [SupportedEngine.POSTGRESQL]:
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
};
