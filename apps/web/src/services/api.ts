import type { ApiResponse, Engine } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8079";

const sqliteFallbackEngine: Engine = {
  name: "sqlite",
  description: "",
  color: "#003B57",
  is_supported: true,
  is_default: true,
};

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json: ApiResponse<T> = await res.json();
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
