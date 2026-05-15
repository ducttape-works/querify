import { container } from "tsyringe";

import { dbConnect } from "./db/connector";
import { SandboxBootstrapService } from "@modules/sandbox/bootstrap.service";
import { SessionsWorker } from "@modules/sessions/sessions.worker";

export const bootstrap = async () => {
  dbConnect();
  await container.resolve(SandboxBootstrapService).initialize();
  container.resolve(SessionsWorker).start();
};
