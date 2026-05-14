import { StatusCodes } from "http-status-codes";
import { NextFunction, Request, Response } from "express";

import AppError from "../utils/errors/base.error";
import { errorResponse } from "../utils/http";

export const routeNotFoundHandler = (_req: Request, response: Response) => {
  errorResponse(
    response,
    "The requested resource was not found",
    {},
    StatusCodes.NOT_FOUND,
  );
};

export const globalErrorHandler = (
  error: Error | AppError,
  _req: Request,
  response: Response,
  next: NextFunction,
) => {
  if (response.headersSent) return next(error);

  const statusCode =
    error instanceof AppError
      ? error.statusCode
      : StatusCodes.INTERNAL_SERVER_ERROR;

  const message =
    error instanceof AppError
      ? error.message
      : "An unexpected error occurred. Please try again later";

  console.error(`[ERROR] ${error.message}\n${error.stack}`);

  const resData = error instanceof AppError ? error.resData : {};

  return errorResponse(response, message, resData, statusCode);
};
