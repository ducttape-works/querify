import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { injectable } from "tsyringe";
import { StatusCodes } from "http-status-codes";

import { sandboxEngineConfigMap } from "@common/const/sandbox-engine-config";
import AppError from "@common/utils/errors/base.error";

const execFileAsync = promisify(execFile);

@injectable()
export class SandboxBootstrapService {
  public async initialize() {
    const images = Object.values(sandboxEngineConfigMap).map(
      (config) => config.image,
    );

    for (const image of images) {
      const existsLocally = await this.imageExists(image);

      console.log("iMGAE EXISTS =====>", existsLocally);

      if (!existsLocally) {
        await this.pullImage(image);
      }
    }
  }

  private async imageExists(image: string) {
    try {
      await this.executeCommand(["image", "inspect", image]);
      return true;
    } catch {
      return false;
    }
  }

  private async pullImage(image: string) {
    await this.executeCommand(["pull", image]).catch(() => {
      throw new AppError(
        `Failed to pull docker image ${image}.`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    });
  }

  private async executeCommand(args: string[]) {
    try {
      return await execFileAsync("docker", args);
    } catch {
      const command = ["docker", ...args].join(" ");

      throw new AppError(
        `Docker command failed: ${command}`,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
