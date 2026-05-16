import { Request } from "express";
import { SandboxSessionModelType } from "@models/sandbox-session.model";

export type AnonymousRequest = Request & {
  anonymousId?: string;
  session?: SandboxSessionModelType;
};
