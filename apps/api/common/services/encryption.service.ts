import fs from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { injectable } from "tsyringe";
import { StatusCodes } from "http-status-codes";

import AppError from "@common/utils/errors/base.error";
import { security } from "@configs/env";

@injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";

  private readonly key: Buffer;

  constructor() {
    this.key = this.loadKey();
  }

  public encrypt(value: string) {
    const iv = randomBytes(12);

    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  public decrypt(value: string) {
    const [iv, authTag, encrypted] = value.split(".");

    if (!iv || !authTag || !encrypted) {
      throw new AppError(
        "Encrypted value is malformed.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }

  private loadKey() {
    try {
      const rawKey = fs
        .readFileSync(security.rootEncryptionKeyPath, "utf8")
        .trim();

      const key = Buffer.from(rawKey, "base64");

      if (key.length !== 32) {
        throw new AppError(
          "Root encryption key must decode to 32 bytes.",
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      return key;
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        "Failed to load root encryption key.",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
