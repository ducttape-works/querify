export default class AppError extends Error {
  public statusCode: number;
  public resData?: unknown;
  public methodName?: string;

  constructor(message: string, statusCode: number, resData?: unknown, methodName?: string) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.resData = resData;
    this.methodName = methodName;

    Error.captureStackTrace(this, this.constructor);
  }
}
