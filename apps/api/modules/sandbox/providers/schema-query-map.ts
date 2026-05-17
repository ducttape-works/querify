import { SupportedEngine } from "@common/enums/engine";

export const sandboxSchemaQueryMap = {
  [SupportedEngine.POSTGRESQL]:
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;",
  [SupportedEngine.MYSQL]:
    "SELECT table_name, column_name, column_type FROM information_schema.columns WHERE table_schema = DATABASE() ORDER BY table_name, ordinal_position;",
  [SupportedEngine.MONGODB]: "db.getCollectionNames()",
};
