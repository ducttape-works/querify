import { Request } from "express";

export type AnonymousRequest = Request & {
  anonymousId?: string;
};
