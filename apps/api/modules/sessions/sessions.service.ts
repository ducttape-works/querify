import { injectable } from "tsyringe";
import dayjs from "dayjs";

import { SessionEventBus } from "@common/events/session-event-bus";
import { BadRequestError } from "@common/utils/errors/app.error";
import { dbEngines } from "@common/const/engines";
import { SupportedEngine } from "@common/enums/engine";
import { SandboxProvider, SandboxStatus } from "@common/enums/sandbox";
import { SandboxProviderFactory } from "@modules/sandbox/providers";
import { sandboxSchemaQueryMap } from "@modules/sandbox/providers/schema-query-map";
import { sandboxOutputParserMap } from "@modules/sandbox/providers/output-parser-map";
import { SandboxSessionRepository, UserRepository } from "@repositories/index";
import { cleanQuery } from "@common/utils/any";
import { EncryptionService } from "@common/services/encryption.service";
import type { SessionSchemaTable } from "@common/types/session-event";
import type { SandboxSessionModelType } from "@models/sandbox-session.model";

@injectable()
export class SessionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sandboxSessionRepository: SandboxSessionRepository,
    private readonly sessionEventBus: SessionEventBus,
    private readonly sandboxProviderFactory: SandboxProviderFactory,
    private readonly encryptionService: EncryptionService,
  ) {}

  public async createSession(anonymousId: string, engine: string) {
    const supportedEngine = dbEngines.find(
      (_engine) => _engine.name === engine && _engine.is_supported,
    );

    if (!supportedEngine) throw new BadRequestError("Unsupported engine");

    if (engine === SupportedEngine.SQLITE) {
      throw new BadRequestError("SQLite runs via wasm");
    }

    const user =
      await this.userRepository.findOrCreateByFingerprint(anonymousId);

    const activeSession =
      await this.sandboxSessionRepository.getActiveSessionForUser(user.id);

    if (activeSession) {
      const timedOut =
        activeSession.status === SandboxStatus.SPAWNING &&
        dayjs().diff(dayjs(activeSession.created_at), "millisecond") >= 2 * 60 * 1000;

      const engineChanged = activeSession.engine !== engine;

      if (timedOut || engineChanged) {
        await this.stopSession(activeSession);
      } else {
        return {
          status: true,
          message: "Active session already exists.",
          data: {
            id: activeSession.id,
            engine: activeSession.engine,
            status: activeSession.status,
          },
        };
      }
    }

    const session = await this.sandboxSessionRepository.create({
      user_id: user.id,
      engine,
      status: SandboxStatus.SPAWNING,
      instance_id: null,
      ended_at: null,
    });

    this.sessionEventBus.publish({
      type: "session.spawn.requested",
      data: {
        sessionId: session.id,
        engine: session.engine as SupportedEngine,
        status: SandboxStatus.SPAWNING,
      },
    });

    return {
      status: true,
      message: "Session is being prepared.",
      data: {
        id: session.id,
        engine: session.engine,
        status: session.status,
      },
    };
  }

  public async getSessionById(sessionId: string, anonymousId: string) {
    const user = await this.userRepository.findByFingerprint(anonymousId);

    if (!user) throw new BadRequestError("Session not found.");

    const session = await this.sandboxSessionRepository.getByIdForUser(
      sessionId,
      user.id,
    );

    if (!session) throw new BadRequestError("Session not found.");

    if (
      session.status === SandboxStatus.SPAWNING &&
      dayjs().diff(dayjs(session.created_at), "millisecond") >=
        2 * 60 * 1000
    ) {
      if (session.instance_id && session.provider) {
        const sandboxProvider = this.sandboxProviderFactory.createByName(
          session.provider as SandboxProvider,
        );

        await sandboxProvider.down(session.instance_id);
      }

      await this.sandboxSessionRepository.update(
        { id: session.id },
        { status: SandboxStatus.ERROR },
      );

      return {
        status: true,
        message: "Session failed to start.",
        data: {
          id: session.id,
          engine: session.engine,
          status: SandboxStatus.ERROR,
        },
      };
    }

    return {
      status: true,
      message: "Session fetched successfully.",
      data: {
        id: session.id,
        engine: session.engine,
        status: session.status,
      },
    };
  }

  public async getSessionSchema(session: SandboxSessionModelType) {
    const provider = this.sandboxProviderFactory.createByName(
      session.provider as SandboxProvider,
    );

    const schemaQuery =
      sandboxSchemaQueryMap[session.engine as SupportedEngine];

    if (!schemaQuery) {
      throw new BadRequestError("Schema inspection is not supported.");
    }

    const result = await provider.execute({
      instanceId: session.instance_id!,
      engine: session.engine as SupportedEngine,
      database: session.database!,
      username: session.username!,
      password: this.getSessionPassword(session),
      query: schemaQuery,
    });

    const parse = sandboxOutputParserMap[session.engine as SupportedEngine];

    if (!parse) {
      throw new BadRequestError(
        `Output parsing not implemented for ${session.engine}`,
      );
    }

    const parsed = parse(result.stdout, 0);
    let tables: SessionSchemaTable[] = [];

    switch (session.engine as SupportedEngine) {
      case SupportedEngine.MONGODB:
        tables = this.buildMongoSchemaTables(parsed.rows);
        break;
      default:
        tables = this.buildSqlSchemaTables(parsed.rows);
        break;
    }

    return {
      status: true,
      message: "Schema fetched successfully.",
      data: {
        tables,
      },
    };
  }

  public async querySession(session: SandboxSessionModelType, query: string) {
    const provider = this.sandboxProviderFactory.createByName(
      session.provider as SandboxProvider,
    );

    const startedAt = Date.now();

    const result = await provider.execute({
      instanceId: session.instance_id!,
      engine: session.engine as SupportedEngine,
      database: session.database!,
      username: session.username!,
      password: this.getSessionPassword(session),
      query: cleanQuery(query, session.engine as SupportedEngine),
    });

    const elapsedMs = Date.now() - startedAt;

    const parse = sandboxOutputParserMap[session.engine as SupportedEngine];

    if (!parse) {
      throw new BadRequestError(
        `Output parsing not implemented for ${session.engine}`,
      );
    }

    const parsed = parse(result.stdout, elapsedMs);

    return {
      status: true,
      message: parsed.message,
      data: parsed,
    };
  }

  public async deleteSession(sessionId: string, anonymousId: string) {
    const user = await this.userRepository.findByFingerprint(anonymousId);

    if (!user) throw new BadRequestError("Session not found.");

    const session = await this.sandboxSessionRepository.getByIdForUser(
      sessionId,
      user.id,
    );

    if (!session) throw new BadRequestError("Session not found.");

    await this.stopSession(session);

    return {
      status: true,
      message: "Session stopped successfully.",
      data: {
        id: session.id,
        engine: session.engine,
        status: SandboxStatus.STOPPED,
      },
    };
  }

  public async getBTreeConceptState(session: SandboxSessionModelType) {
    const provider = this.sandboxProviderFactory.createByName(
      session.provider as SandboxProvider,
    );

    const exec = (query: string) =>
      provider.execute({
        instanceId: session.instance_id!,
        engine: session.engine as SupportedEngine,
        database: session.database!,
        username: session.username!,
        password: this.getSessionPassword(session),
        query,
      });

    const out = await exec(`SELECT id FROM products ORDER BY id`);

    const keys = this.parseTabularRows(out.stdout)
      .map((row) => parseInt(row.id))
      .filter((n) => !isNaN(n));

    return {
      status: true,
      message: "B-tree state fetched.",
      data: { keys },
    };
  }

  public async stopSession(session: SandboxSessionModelType) {
    if (session.instance_id && session.provider) {
      const sandboxProvider = this.sandboxProviderFactory.createByName(
        session.provider as SandboxProvider,
      );

      await sandboxProvider.down(session.instance_id);
    }

    await this.sandboxSessionRepository.update(
      { id: session.id },
      {
        status: SandboxStatus.STOPPED,
        ended_at: dayjs().toISOString(),
      },
    );
  }

  private parseTabularRows(stdout: string) {
    const lines = stdout.trimEnd().split("\n").filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split("\t").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const cols = line.split("\t");

      const row: Record<string, string> = {};

      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = (cols[i] ?? "").trim();
      }

      return row;
    });
  }

  private getSessionPassword(session: SandboxSessionModelType) {
    if (!session.password_ciphertext) {
      throw new BadRequestError("Session credentials are missing.");
    }

    return this.encryptionService.decrypt(session.password_ciphertext);
  }

  private buildMongoSchemaTables(rows: (string | null)[][]) {
    const tables: SessionSchemaTable[] = [];

    for (const row of rows) {
      if (!row[0]) continue;

      tables.push({
        name: row[0],
        columns: [],
      });
    }

    return tables;
  }

  private buildSqlSchemaTables(rows: (string | null)[][]) {
    const tables: SessionSchemaTable[] = [];
    let currentTable: SessionSchemaTable | null = null;

    for (const row of rows) {
      if (!row[0]) continue;

      if (!currentTable || currentTable.name !== row[0]) {
        currentTable = {
          name: row[0],
          columns: [],
        };

        tables.push(currentTable);
      }

      if (row[1]) {
        currentTable.columns.push({
          name: row[1],
          type: row[2] ?? "",
        });
      }
    }

    return tables;
  }
}
