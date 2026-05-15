import "dotenv/config";

export const app = {
  name: "Querify",
  port: Number(process.env.PORT) || 8079,
  environment: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
};

export const db = {
  path: process.env.DB_PATH ?? "./querify.db",
};
