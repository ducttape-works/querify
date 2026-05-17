import { container } from "tsyringe";

import { AppServer } from "@common/types/http";
import { querySessionInterceptor } from "@common/interceptors/query-session.interceptor";
import { createSlidingWindowRateLimitInterceptor } from "@common/interceptors/rate-limit.interceptor";
import { SessionsController } from "./sessions.controller";

const createSessionRateLimitInterceptor =
  createSlidingWindowRateLimitInterceptor({
    maxAttempts: 15,
  });

const queryRateLimitInterceptor = createSlidingWindowRateLimitInterceptor({
  maxAttempts: 30,
});

export const sessionsRoutes = (server: AppServer, prefix: string) => {
  const controller = container.resolve(SessionsController);

  server.post(
    `${prefix}/sessions`,
    createSessionRateLimitInterceptor,
    controller.createSession,
  );

  server.get(`${prefix}/sessions/:id`, controller.getSessionById);
  server.get(
    `${prefix}/sessions/:id/schema`,
    querySessionInterceptor,
    controller.getSessionSchema,
  );
  server.post(
    `${prefix}/sessions/:id/query`,
    queryRateLimitInterceptor,
    querySessionInterceptor,
    controller.querySession,
  );
  server.delete(`${prefix}/sessions/:id`, controller.deleteSession);
  server.get(
    `${prefix}/sessions/:id/concepts/btree`,
    querySessionInterceptor,
    controller.getBTreeConceptState,
  );
  server.get(`${prefix}/sessions/:id/events`, controller.streamSessionEvents);
};
