import { BadRequestError } from "./errors/app.error";
import { SupportedEngine } from "@common/enums/engine";
import { restrictedQueryOperations } from "@common/const/restricted-query-operations";

const MAX_QUERY_LENGTH = 20_000;

export const cleanQuery = (query: string, engine: SupportedEngine) => {
  if (!query) throw new BadRequestError("Query cannot be empty.");

  query = query.trim();

  if (query.length > MAX_QUERY_LENGTH) {
    throw new BadRequestError("Query is too large.");
  }

  query = query.replace(/;\s*$/, "");

  if (query.includes(";")) {
    throw new BadRequestError("Only one SQL statement is allowed.");
  }

  const loweredQuery = query.toLowerCase();

  const restrictedOperations = restrictedQueryOperations[engine] ?? [];

  for (const operation of restrictedOperations) {
    if (loweredQuery.includes(operation)) {
      throw new BadRequestError("This query uses a restricted operation.");
    }
  }

  if (
    engine === SupportedEngine.POSTGRESQL &&
    loweredQuery.includes("copy") &&
    (loweredQuery.includes("program") ||
      loweredQuery.includes(" from '") ||
      loweredQuery.includes(" to '"))
  ) {
    throw new BadRequestError("This query uses a restricted operation.");
  }

  return query;
};
