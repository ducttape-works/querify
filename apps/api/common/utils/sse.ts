import { Response } from "express";

export const createSseStream = (response: Response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(": ping\n\n");
  }, 25_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    if (!response.writableEnded) response.end();
  };

  const send = (type: string, payload: unknown) => {
    if (response.writableEnded) return;

    response.write(`event: ${type}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  return { send, cleanup };
};
