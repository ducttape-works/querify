import { UserModelType } from "@models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: UserModelType;
      anonymousId?: string;
    }
  }
}

export {};
