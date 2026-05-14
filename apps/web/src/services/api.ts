import type { ApiResponse, Engine } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8079";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json: ApiResponse<T> = await res.json();
  return json.data;
}

export const fetchEngines = () => request<Engine[]>("/api/engines");
