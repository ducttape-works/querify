import { NextFunction, Request, Response } from "express";
import { ulid } from "ulid";

import { app } from "@configs/env";

const COOKIE_NAME = "querify_utk";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export const cookieInterceptor = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const anonymousId = req.cookies[COOKIE_NAME] ?? ulid();

  if (!req.cookies?.[COOKIE_NAME]) {
    res.cookie(COOKIE_NAME, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: app.isProduction,
      maxAge: SIX_HOURS_MS,
      path: "/",
    });
  }

  req.anonymousId = anonymousId;

  next();
};
