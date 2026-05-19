import { NextFunction, Response } from "express";
import { ulid } from "ulid";

import type { AnonymousRequest } from "@common/types/request";
import { app } from "@configs/env";

const COOKIE_NAME = "querify_utk";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const COOKIE_SAME_SITE = app.isProduction ? "none" : "lax";

export const cookieInterceptor = async (
  req: AnonymousRequest,
  res: Response,
  next: NextFunction,
) => {
  const anonymousId = req.cookies[COOKIE_NAME] ?? ulid();

  if (!req.cookies?.[COOKIE_NAME]) {
    res.cookie(COOKIE_NAME, anonymousId, {
      httpOnly: true,
      sameSite: COOKIE_SAME_SITE,
      secure: app.isProduction,
      maxAge: SIX_HOURS_MS,
      path: "/",
    });
  }

  req.anonymousId = anonymousId;

  next();
};
