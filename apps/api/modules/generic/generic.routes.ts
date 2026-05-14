import { container } from "tsyringe";

import { AppServer } from "@common/types/http";
import { GenericController } from "./generic.controller";

export const genericRoutes = (server: AppServer, prefix: string) => {
  const controller = container.resolve(GenericController);
  server.get(`${prefix}/engines`, controller.getSupportedEngines);
};
