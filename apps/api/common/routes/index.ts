import { Request, Response } from "express";

import { AppServer } from "@common/types/http";
import { successResponse } from "@common/utils/http";
import { genericRoutes } from "@modules/generic/generic.routes";

export default (server: AppServer): void => {
  server.get("/health", (_: Request, response: Response) => {
    return successResponse(response, "OK");
  });

  genericRoutes(server, "/api");
};
