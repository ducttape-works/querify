import { inject, injectable } from "tsyringe";

@injectable()
export class SlidingWindowRateLimiter {
  private readonly persistedState = new Map<string, Date[]>();

  constructor(
    @inject("rate-limit-max-attempts")
    private readonly maxAttempts: number,
    @inject("rate-limit-window-ms")
    private readonly windowMs: number,
  ) {}

  public shouldPermit(uid: string) {
    const now = new Date();

    const userReqWindows = this.persistedState.get(uid) ?? [];

    const filteredWindows = userReqWindows.filter(
      (requestTime) => now.getTime() - requestTime.getTime() < this.windowMs,
    );

    if (filteredWindows.length >= this.maxAttempts) {
      this.persistedState.set(uid, filteredWindows);

      return false;
    }

    filteredWindows.push(now);

    this.persistedState.set(uid, filteredWindows);

    return true;
  }
}
