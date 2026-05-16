import { container } from "tsyringe";

import { dbConnect } from "./db/connector";
import { SandboxBootstrapService } from "@modules/sandbox/bootstrap.service";
import { SessionsCleanupWorker } from "@modules/sessions/sessions-cleanup.worker";
import { SessionsWorker } from "@modules/sessions/sessions.worker";

export const bootstrap = async () => {
  dbConnect();
  await container.resolve(SandboxBootstrapService).initialize();
  container.resolve(SessionsWorker).start();
  container.resolve(SessionsCleanupWorker).start();
};
