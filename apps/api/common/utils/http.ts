import { StatusCodes } from "http-status-codes";
import { Response } from "express";

const sendResponse = (
  response: Response,
  success: boolean,
  message: string,
  data?: unknown,
  statusCode?: number,
) => {
  const _statusCode = success ? StatusCodes.OK : StatusCodes.BAD_REQUEST;

  response
    .status(Number.isInteger(statusCode) ? statusCode! : _statusCode)
    .send({ success, message, data });
};

export const successResponse = (
  response: Response,
  message: string,
  data?: unknown,
  statusCode?: number,
) => sendResponse(response, true, message, data, statusCode);

export const errorResponse = (
  response: Response,
  message: string,
  data?: unknown,
  statusCode?: number,
) => sendResponse(response, false, message, data, statusCode);

export const genericResponse = (params: {
  response: Response;
  data: { status: boolean; message: string; data?: unknown };
  statusCode?: StatusCodes;
}) => {
  const { response, data: responseData, statusCode } = params;

  if (responseData.status !== true)
    return errorResponse(
      response,
      responseData.message,
      responseData.data,
      statusCode,
    );

  return successResponse(
    response,
    responseData.message,
    responseData.data,
    statusCode,
  );
};
