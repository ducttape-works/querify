import "dotenv/config";
import * as process from "process";
require("dotenv").config();

export const app = {
  name: "Querify",
  port: Number(process.env.PORT) || 8079,
  environment: process.env.NODE_ENV || "development",
};
