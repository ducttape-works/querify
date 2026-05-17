import type { PersistedState } from "../types/persistence";

const STORAGE_KEY = "querify:playground";
const MAX_QUERY_LENGTH = 5000;

const readState = (): PersistedState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw) as PersistedState;

    return {
      activeEngineName: parsed.activeEngineName,
      query: parsed.query ? parsed.query.slice(0, MAX_QUERY_LENGTH) : undefined,
    };
  } catch {
    return {};
  }
};

const writeState = (nextState: PersistedState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    return;
  }
};

export const getPersistedQuery = () => readState().query;

export const getPersistedEngineName = () => readState().activeEngineName;

export const persistQuery = (query: string) => {
  const state = readState();

  writeState({
    ...state,
    query: query.slice(0, MAX_QUERY_LENGTH),
  });
};

export const persistEngineName = (activeEngineName: string) => {
  const state = readState();

  writeState({
    ...state,
    activeEngineName,
  });
};
