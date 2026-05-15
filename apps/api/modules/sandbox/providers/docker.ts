import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { injectable } from "tsyringe";
import { StatusCodes } from "http-status-codes";

import { sandboxEngineConfigMap } from "@common/const/sandbox-engine-config";
import { SandboxProvider as SandboxProviderName } from "@common/enums/sandbox";
import AppError from "@common/utils/errors/base.error";
import {
  SandboxProvider,
  SandboxProvisionInput,
  SandboxRuntime,
} from "@common/types/sandbox-provider";
import type { EngineDockerConfig } from "@common/types/sandbox-engine-config";

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

    const password = randomBytes(24).toString("hex");

    const config = {
      ...baseConfig,
      password,
      environment: [
        `POSTGRES_DB=${baseConfig.database}`,
        `POSTGRES_USER=${baseConfig.username}`,
        `POSTGRES_PASSWORD=${password}`,
      ],
    };

    const containerName =
      `querify_${payload.engine}_${payload.sessionId}`.toLowerCase();

    await this.ensureImageExists(config.image);

    try {
      const instanceId = await this.startContainer(containerName, config);

      await this.waitUntilReady(instanceId, config);

      const hostPort = await this.getMappedPort(
        instanceId,
        config.containerPort,
      );

      return {
        instanceId,
        provider: SandboxProviderName.DOCKER,
        host: "127.0.0.1",
        port: hostPort,
        database: config.database,
        username: config.username,
        password: config.password,
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
    await this.executeCommand(["rm", "-f", instanceId]);
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
    containerName: string,
    config: EngineDockerConfig & { password: string; environment: string[] },
  ) {
    const envs: string[] = [];

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
      "--memory",
      config.memory,
      "--cpus",
      config.cpus,
      "--publish",
      `127.0.0.1::${config.containerPort}`,
      ...envs,
      config.image,
    ];

    const { stdout } = await this.executeCommand(args);

    return stdout.trim();
  }

  private async getMappedPort(instanceId: string, containerPort: number) {
    const { stdout } = await this.executeCommand([
      "port",
      instanceId,
      String(containerPort),
    ]);

    const output = stdout.trim();

    if (!output) {
      throw new AppError(
        "Docker did not expose a host port for the sandbox.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const binding = output.split("\n")[0]?.trim();

    if (!binding) {
      throw new AppError(
        "Docker returned an empty port binding.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const port = Number(binding.split(":").pop());

    if (!Number.isInteger(port)) {
      throw new AppError(
        "Docker returned an invalid host port.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    return port;
  }

  private async waitUntilReady(
    instanceId: string,
    config: EngineDockerConfig & { password: string; environment: string[] },
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
          config.username,
          "-d",
          config.database,
        ]);

        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new AppError(
      "Docker sandbox did not become ready within ping window.",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  private async executeCommand(args: string[]) {
    try {
      return await execFileAsync("docker", args);
    } catch (error) {
      const command = ["docker", ...args].join(" ");
      const { stderr = "" } = error as { stderr?: string };

      throw new AppError(
        stderr
          ? `Docker command failed: ${command}. ${stderr.trim()}`
          : `Docker command failed: ${command}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
