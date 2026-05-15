import { EventEmitter } from "events";
import { singleton } from "tsyringe";

import type { SessionEvent } from "@common/types/session-event";

@singleton()
export class SessionEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500);
  }

  public publish(event: SessionEvent) {
    this.emit(event.type, event);
    this.emit(`session:${event.data.sessionId}`, event);
  }

  public onSpawnRequested(listener: (event: SessionEvent) => void) {
    this.on("session.spawn.requested", listener);
  }

  public onSession(sessionId: string, listener: (event: SessionEvent) => void) {
    this.on(`session:${sessionId}`, listener);
  }

  public offSession(
    sessionId: string,
    listener: (event: SessionEvent) => void,
  ) {
    this.off(`session:${sessionId}`, listener);
  }
}
