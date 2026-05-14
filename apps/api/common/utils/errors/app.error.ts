import { StatusCodes } from "http-status-codes";

import AppError from "./base.error";

export class UnAuthorizedError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.UNAUTHORIZED, resData, methodName);
  }
}

export class ValidatorError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, resData, methodName);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.BAD_REQUEST, resData, methodName);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.FORBIDDEN, resData, methodName);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.NOT_FOUND, resData, methodName);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, resData?: unknown, methodName?: string) {
    super(message, StatusCodes.CONFLICT, resData, methodName);
  }
}
