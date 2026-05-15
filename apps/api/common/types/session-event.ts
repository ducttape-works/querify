import { SandboxStatus } from "@common/enums/sandbox";

export type SessionEvent = {
  type: "session.spawn.requested" | "session.ready" | "session.error";
  data: {
    sessionId: string;
    engine: string;
    status: SandboxStatus;
    message?: string;
  };
};
