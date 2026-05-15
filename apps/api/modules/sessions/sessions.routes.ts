import { container } from "tsyringe";

import { AppServer } from "@common/types/http";
import { createSlidingWindowRateLimitInterceptor } from "@common/interceptors/rate-limit.interceptor";
import { SessionsController } from "./sessions.controller";

const createSessionRateLimitInterceptor =
  createSlidingWindowRateLimitInterceptor({
    maxAttempts: 5,
  });

export const sessionsRoutes = (server: AppServer, prefix: string) => {
  const controller = container.resolve(SessionsController);

  server.post(
    `${prefix}/sessions`,
    createSessionRateLimitInterceptor,
    controller.createSession,
  );

  server.get(`${prefix}/sessions/:id`, controller.getSessionById);
};
