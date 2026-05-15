import "dotenv/config";
import path from "node:path";

export const app = {
  name: "Querify",
  port: Number(process.env.PORT) || 8079,
  environment: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
};

export const db = {
  path: process.env.DB_PATH ?? "./querify.db",
};

export const security = {
  rootEncryptionKeyPath: path.join(process.cwd(), ".querify-root.key"),
};
