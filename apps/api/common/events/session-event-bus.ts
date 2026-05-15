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
  }

  public onSpawnRequested(listener: (event: SessionEvent) => void) {
    this.on("session.spawn.requested", listener);
  }
}
