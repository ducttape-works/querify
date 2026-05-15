import { SupportedEngine } from "@common/enums/engine";

export type SupportEngine = {
  name: SupportedEngine;
  description: string;
  color: string;
  is_supported: boolean;
  is_default: boolean;
};
