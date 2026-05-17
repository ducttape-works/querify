import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { injectable } from "tsyringe";
import { StatusCodes } from "http-status-codes";

import { sandboxEngineConfigMap } from "@common/const/sandbox-engine-config";
import { SupportedEngine } from "@common/enums/engine";
import { SandboxProvider as SandboxProviderName } from "@common/enums/sandbox";
import AppError from "@common/utils/errors/base.error";
import {
  SandboxProvider,
  SandboxProvisionInput,
  SandboxQuery,
  SandboxRuntime,
  SandboxExecutionResult,
} from "@common/types/sandbox-provider";
import type { EngineDockerConfig } from "@common/types/sandbox-engine-config";
import { sandboxQueryCommandMap } from "./query-command-map";

const execFileAsync = promisify(execFile);

@injectable()
export class DockerSandboxProvider implements SandboxProvider {
  private readonly _internalLabel = "querify.managed=true";

  public async up(payload: SandboxProvisionInput): Promise<SandboxRuntime> {
    const baseConfig = sandboxEngineConfigMap[payload.engine];

    if (!baseConfig) {
      throw new AppError(
        `Docker provider is not implemented for ${payload.engine}.`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const config = this.buildRuntimeConfig(payload.engine, baseConfig);

    const containerName =
      `querify_${payload.engine}_${payload.sessionId}`.toLowerCase();

    await this.ensureImageExists(config.image);

    try {
      const instanceId = await this.startContainer(
        payload.engine,
        containerName,
        config,
      );

      await this.prepareInstance(payload.engine, instanceId, config);

      return {
        instanceId,
        provider: SandboxProviderName.DOCKER,
        host: null,
        port: null,
        database: config.database,
        username: config.queryUsername,
        password: config.queryPassword,
      };
    } catch (error) {
      await this.down(containerName);

      console.error(
        {
          err: error,
          sessionId: payload.sessionId,
          engine: payload.engine,
        },
        "Failed to start docker sandbox instance",
      );

      if (error instanceof AppError) throw error;

      throw new AppError(
        "Failed to start docker sandbox instance.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async down(instanceId: string): Promise<void> {
    try {
      await this.executeCommand(["rm", "-f", instanceId]);
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message.includes("No such container")
      ) {
        return;
      }

      throw error;
    }
  }

  public async execute(payload: SandboxQuery): Promise<SandboxExecutionResult> {
    const resolveCommand =
      sandboxQueryCommandMap[payload.engine as SupportedEngine];

    if (!resolveCommand) {
      throw new AppError(
        `Sandbox query execution is not implemented for ${payload.engine}.`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    return await this.executeCommand(["exec", ...resolveCommand(payload)]);
  }

  public async pruneManagedContainers(): Promise<void> {
    const { stdout } = await this.executeCommand([
      "ps",
      "-aq",
      "--filter",
      `label=${this._internalLabel}`,
    ]);

    const containerIds = stdout.trim();

    if (!containerIds) return;

    await this.executeCommand(["rm", "-f", ...containerIds.split("\n")]);
  }

  private async ensureImageExists(image: string) {
    try {
      await this.executeCommand(["image", "inspect", image]);
    } catch (error) {
      throw new AppError(
        `Docker image ${image} is not available locally. Pull it before creating sessions.`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async startContainer(
    engine: SupportedEngine,
    containerName: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const envs: string[] = [];
    const securityArgs = this.getContainerSecurityArgs(engine);

    for (const value of config.environment) {
      envs.push("--env", value);
    }

    const args = [
      "run",
      "-d",
      "--name",
      containerName,
      "--label",
      this._internalLabel,
      "--pids-limit",
      "128",
      "--memory",
      config.memory,
      "--cpus",
      config.cpus,
      "--network",
      "none",
      ...securityArgs,
      ...envs,
      config.image,
      ...(config.extraArgs ?? []),
    ];

    const { stdout } = await this.executeCommand(args);

    return stdout.trim();
  }

  private async prepareInstance(
    engine: SupportedEngine,
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    switch (engine) {
      case SupportedEngine.POSTGRESQL:
        await this.waitUntilPostgresReady(instanceId, config);
        await this.configurePostgresQueryRole(instanceId, config);
        return;
      case SupportedEngine.MYSQL:
        await this.waitUntilMySqlReady(instanceId, config);
        await this.configureMySqlQueryUser(instanceId, config);
        return;
      case SupportedEngine.MONGODB:
        await this.waitUntilMongoReady(instanceId, config);
        await this.configureMongoQueryUser(instanceId, config);
        return;
      default:
        return;
    }
  }

  private buildRuntimeConfig(
    engine: SupportedEngine,
    baseConfig: EngineDockerConfig,
  ) {
    const adminPassword = randomBytes(24).toString("hex");
    const queryPassword = randomBytes(24).toString("hex");

    switch (engine) {
      case SupportedEngine.POSTGRESQL:
        return {
          ...baseConfig,
          adminUsername: `${baseConfig.username}_admin`,
          adminPassword,
          queryUsername: `${baseConfig.username}_runner`,
          queryPassword,
          environment: [
            `POSTGRES_DB=${baseConfig.database}`,
            `POSTGRES_USER=${baseConfig.username}_admin`,
            `POSTGRES_PASSWORD=${adminPassword}`,
          ],
        };
      case SupportedEngine.MYSQL:
        return {
          ...baseConfig,
          adminUsername: "root",
          adminPassword,
          queryUsername: `${baseConfig.username}_runner`,
          queryPassword,
          environment: [
            `MYSQL_DATABASE=${baseConfig.database}`,
            `MYSQL_ROOT_PASSWORD=${adminPassword}`,
          ],
        };
      case SupportedEngine.MONGODB:
        return {
          ...baseConfig,
          adminUsername: "root",
          adminPassword,
          queryUsername: `${baseConfig.username}_runner`,
          queryPassword,
          environment: [
            `MONGO_INITDB_ROOT_USERNAME=root`,
            `MONGO_INITDB_ROOT_PASSWORD=${adminPassword}`,
            `MONGO_INITDB_DATABASE=${baseConfig.database}`,
          ],
        };
      default:
        throw new AppError(
          `Docker provider is not implemented for ${engine}.`,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
    }
  }

  private async waitUntilPostgresReady(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const maxAttempts = 20;

    const delayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.executeCommand([
          "exec",
          instanceId,
          "pg_isready",
          "-U",
          config.adminUsername,
          "-d",
          config.database,
        ]);

        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new AppError(
      "Sandbox did not become ready within ping window.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  private getContainerSecurityArgs(engine: SupportedEngine) {
    switch (engine) {
      case SupportedEngine.MYSQL:
      case SupportedEngine.MONGODB:
        return ["--security-opt", "no-new-privileges:true"];
      default:
        return [
          "--security-opt",
          "no-new-privileges:true",
          "--cap-drop",
          "ALL",
          "--cap-add",
          "SETUID",
          "--cap-add",
          "SETGID",
        ];
    }
  }

  private async waitUntilMySqlReady(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const maxAttempts = 60;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.executeCommand(
          [
            "exec",
            "-e", `MYSQL_PWD=${config.adminPassword}`,
            instanceId,
            "mysql",
            "--connect-timeout=2",
            "-h", "127.0.0.1",
            "-u", config.adminUsername,
            `--database=${config.database}`,
            "-e", "SELECT 1",
          ],
          3000,
        );

        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new AppError(
      "Sandbox did not become ready within ping window.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  private async configurePostgresQueryRole(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const sql = `
      DROP ROLE IF EXISTS ${config.queryUsername};
      CREATE ROLE ${config.queryUsername}
      LOGIN
      PASSWORD '${config.queryPassword}'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
      GRANT CONNECT, TEMP ON DATABASE ${config.database} TO ${config.queryUsername};
      GRANT USAGE, CREATE ON SCHEMA public TO ${config.queryUsername};
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${config.queryUsername};
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${config.queryUsername};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${config.queryUsername};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${config.queryUsername};
      ALTER ROLE ${config.queryUsername} SET statement_timeout = '5000ms';
      ALTER ROLE ${config.queryUsername} SET lock_timeout = '2000ms';
      ALTER ROLE ${config.queryUsername} SET idle_in_transaction_session_timeout = '5000ms';
    `;

    await this.executeCommand([
      "exec",
      instanceId,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      config.adminUsername,
      "-d",
      config.database,
      "-c",
      sql,
    ]);
  }

  private async configureMySqlQueryUser(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const sql = `
      DROP USER IF EXISTS '${config.queryUsername}'@'%';
      CREATE USER '${config.queryUsername}'@'%' IDENTIFIED BY '${config.queryPassword}';
      GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX ON \`${config.database}\`.* TO '${config.queryUsername}'@'%';
      FLUSH PRIVILEGES;
    `;

    await this.executeCommand([
      "exec",
      "-e",
      `MYSQL_PWD=${config.adminPassword}`,
      instanceId,
      "mysql",
      "-h",
      "127.0.0.1",
      "-u",
      config.adminUsername,
      `--database=${config.database}`,
      "-e",
      sql,
    ]);
  }

  private async waitUntilMongoReady(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const maxAttempts = 60;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.executeCommand(
          [
            "exec",
            instanceId,
            "mongosh",
            "--quiet",
            "--host", "127.0.0.1",
            "--port", "27017",
            "-u", config.adminUsername,
            "-p", config.adminPassword,
            "--authenticationDatabase", "admin",
            "--eval", "db.adminCommand('ping')",
          ],
          3000,
        );

        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new AppError(
      "Sandbox did not become ready within ping window.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  private async configureMongoQueryUser(
    instanceId: string,
    config: EngineDockerConfig & {
      adminUsername: string;
      adminPassword: string;
      queryUsername: string;
      queryPassword: string;
      environment: string[];
    },
  ) {
    const db = `db.getSiblingDB("${config.database}")`;

    await this.executeCommand([
      "exec",
      instanceId,
      "mongosh",
      "--quiet",
      "-u", config.adminUsername,
      "-p", config.adminPassword,
      "--authenticationDatabase", "admin",
      "--host", "127.0.0.1",
      "--port", "27017",
      "--eval", `try { ${db}.dropUser("${config.queryUsername}"); } catch(e) {} ${db}.createUser({ user: "${config.queryUsername}", pwd: "${config.queryPassword}", roles: [{ role: "readWrite", db: "${config.database}" }] })`,
    ]);
  }

  private async executeCommand(args: string[], timeoutMs?: number) {
    try {
      return await execFileAsync("docker", args, timeoutMs ? { timeout: timeoutMs } : {});
    } catch (error) {
      const { stderr = "", stdout = "" } = error as {
        stderr?: string;
        stdout?: string;
      };

      throw new AppError(
        stderr.trim() || stdout.trim() || "Something went wrong.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
