import dayjs from "dayjs";
import { NextFunction, Response } from "express";
import { container } from "tsyringe";

import { SandboxStatus } from "@common/enums/sandbox";
import type { AnonymousRequest } from "@common/types/request";
import { BadRequestError } from "@common/utils/errors/app.error";
import { SandboxSessionRepository, UserRepository } from "@repositories/index";
import { SessionService } from "@modules/sessions/sessions.service";

const userRepository = container.resolve(UserRepository);
const sandboxSessionRepository = container.resolve(SandboxSessionRepository);
const sessionService = container.resolve(SessionService);

export const querySessionInterceptor = async (
  request: AnonymousRequest,
  _response: Response,
  next: NextFunction,
) => {
  const user = await userRepository.findByFingerprint(request.anonymousId ?? "");

  if (!user) throw new BadRequestError("Session not found.");

  const session = await sandboxSessionRepository.getByIdForUser(
    request.params.id as string,
    user.id,
  );

  if (!session) throw new BadRequestError("Session not found.");

  if (
    !session.provider ||
    !session.instance_id ||
    ![SandboxStatus.READY, SandboxStatus.RUNNING].includes(session.status)
  ) {
    throw new BadRequestError("Session is not ready.");
  }

  if (dayjs().diff(dayjs(session.created_at), "millisecond") >= 60 * 60 * 1000) {
    await sessionService.stopSession(session);
    throw new BadRequestError("Session expired.");
  }

  request.session = session;
  next();
};
