import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { AddressInfo, createServer } from "node:net";
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

    const hostPort = await this.getAvailablePort();

    await this.ensureImageExists(config.image);

    try {
      const instanceId = await this.startContainer(
        containerName,
        hostPort,
        config,
      );

      await this.waitUntilReady(instanceId, config);

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

      throw new AppError(
        "Failed to start docker sandbox instance.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async down(instanceId: string): Promise<void> {
    await this.executeCommand(["rm", "-f", instanceId]);
  }

  private async getAvailablePort() {
    const server = createServer();

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);

      server.listen(0, "127.0.0.1", () => {
        resolve();
      });
    });

    const address = server.address();

    if (!address) {
      server.close();

      throw new AppError(
        "Could not find an available port.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const port = (address as AddressInfo).port;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    return port;
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
    hostPort: number,
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
      "--memory",
      config.memory,
      "--cpus",
      config.cpus,
      "--publish",
      `127.0.0.1:${hostPort}:${config.containerPort}`,
      ...envs,
      config.image,
    ];

    const { stdout } = await this.executeCommand(args);

    return stdout.trim();
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

      throw new AppError(
        `Docker command failed: ${command}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
