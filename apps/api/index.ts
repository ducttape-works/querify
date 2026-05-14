import "reflect-metadata";
import { container } from "tsyringe";

import Application from "./app";
import { dbDisconnect } from "./db/connector";
import { app as applicationConfig } from "./configs/env";

const application: Application = container.resolve(Application);

const shutdown = async () => {
  await application.shutDown();
  await dbDisconnect();
};

process
  .on("uncaughtException", async (error) => {
    console.error({ err: error }, "UNCAUGHT_EXCEPTION");
    await shutdown();
    process.exit(1);
  })
  .on("SIGINT", async () => {
    await shutdown();
    process.exit(0);
  });

application
  .startUp(applicationConfig.port)
  .then(() =>
    console.info("Server is listening on port %o />", applicationConfig.port),
  )
  .catch((error) => {
    console.error(
      { err: error },
      "An error occurred while trying to start server",
    );
    process.exit(1);
  });
