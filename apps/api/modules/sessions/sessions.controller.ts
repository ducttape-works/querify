import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { injectable } from "tsyringe";

import { SessionEventBus } from "@common/events/session-event-bus";
import type { AnonymousRequest } from "@common/types/request";
import { createSseStream } from "@common/utils/sse";
import { genericResponse } from "@common/utils/http";
import { SessionService } from "./sessions.service";

@injectable()
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionEventBus: SessionEventBus,
  ) {}

  createSession = async (request: AnonymousRequest, response: Response) => {
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

  getSessionById = async (request: AnonymousRequest, response: Response) => {
    const data = await this.sessionService.getSessionById(
      request.params.id as string,
      request.anonymousId ?? "",
    );

    return genericResponse({
      response,
      data,
      statusCode: StatusCodes.OK,
    });
  };

  streamSessionEvents = async (
    request: AnonymousRequest,
    response: Response,
  ) => {
    const session = await this.sessionService.getSessionById(
      request.params.id as string,
      request.anonymousId ?? "",
    );

    const stream = createSseStream(response);

    if (session.data?.status !== "spawning") {
      stream.send(`session.${session.data?.status}`, session.data);
      stream.cleanup();
      return;
    }

    const listener = (event: {
      type: string;
      data: { sessionId: string; engine: string; status: string; message?: string };
    }) => {
      if (event.data.sessionId !== request.params.id) return;

      stream.send(event.type, {
        id: event.data.sessionId,
        engine: event.data.engine,
        status: event.data.status,
        message: event.data.message,
      });

      if (event.type === "session.ready" || event.type === "session.error") {
        this.sessionEventBus.offSession(request.params.id as string, listener);
        stream.cleanup();
      }
    };

    this.sessionEventBus.onSession(request.params.id as string, listener);

    request.on("close", () => {
      this.sessionEventBus.offSession(request.params.id as string, listener);
      stream.cleanup();
    });
  };
}
