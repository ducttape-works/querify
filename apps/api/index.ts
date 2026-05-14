import "reflect-metadata";
import { container } from "tsyringe";

import Application from "./app";
import { app as applicationConfig } from "./configs/env";

const application: Application = container.resolve(Application);

process
  .on("uncaughtException", async (error) => {
    console.error({ err: error }, "UNCAUGHT_EXCEPTION");
    await application.shutDown();
    process.exit(1);
  })
  .on("SIGINT", async () => {
    await application.shutDown();
    process.exit(1);
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
