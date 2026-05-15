import type { ApiResponse, Engine, Session } from "../types/api";

export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8079";

const sqliteFallbackEngine: Engine = {
  name: "sqlite",
  description: "",
  color: "#003B57",
  is_supported: true,
  is_default: true,
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || `${res.status} ${res.statusText}`);
  }

  return json.data;
}

export const fetchEngines = async () => {
  try {
    const engines = await request<Engine[]>("/api/engines");

    return {
      engines,
      usingFallback: false,
    };
  } catch {
    return {
      engines: [sqliteFallbackEngine],
      usingFallback: true,
    };
  }
};

export const createSession = (engine: string) =>
  request<Session>("/api/sessions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ engine }),
  });

export const fetchSession = (id: string) => request<Session>(`/api/sessions/${id}`);

export const getSessionEventsUrl = (id: string) =>
  `${BASE_URL}/api/sessions/${id}/events`;
