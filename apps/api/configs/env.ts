import "dotenv/config";

export const app = {
  name: "Querify",
  port: Number(process.env.PORT) || 8079,
  environment: process.env.NODE_ENV || "development",
};

export const db = {
  path: process.env.DB_PATH ?? "./querify.db",
};
