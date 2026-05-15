import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { injectable } from "tsyringe";

import { genericResponse } from "@common/utils/http";
import { SessionService } from "./sessions.service";

@injectable()
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  createSession = async (request: Request, response: Response) => {
    const data = await this.sessionService.createSession(
      request.anonymousId ?? "",
      request.body.engine,
    );

    return genericResponse({
      response,
      data,
      statusCode: StatusCodes.OK,
    });
  };
}
