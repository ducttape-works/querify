import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { container } from "tsyringe";

import { SlidingWindowRateLimiter } from "@common/implementations/sliding-window-rate-limiter";
import type { SlidingWindowRateLimitConfig } from "@common/types/rate-limit";
import { errorResponse } from "@common/utils/http";

export const createSlidingWindowRateLimitInterceptor = (
  config: SlidingWindowRateLimitConfig,
) => {
  const scopedContainer = container.createChildContainer();

  scopedContainer.registerInstance(
    "rate-limit-max-attempts",
    config.maxAttempts ?? 20,
  );

  scopedContainer.registerInstance(
    "rate-limit-window-ms",
    config.windowMs ?? 60 * 1000,
  );

  const rateLimiter = scopedContainer.resolve(SlidingWindowRateLimiter);

  return (req: Request, res: Response, next: NextFunction) => {
    const rateLimitKey = req.anonymousId ?? req.ip ?? "anonymous";

    if (!rateLimiter.shouldPermit(rateLimitKey)) {
      return errorResponse(
        res,
        "Too many session creation attempts. Please try again in a minute.",
        {},
        StatusCodes.TOO_MANY_REQUESTS,
      );
    }

    next();
  };
};
