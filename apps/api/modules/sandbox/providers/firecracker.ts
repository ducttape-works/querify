import { injectable } from "tsyringe";

import {
  SandboxProvider,
  SandboxProvisionInput,
  SandboxRuntime,
} from "@common/types/sandbox-provider";

// https://jvns.ca/blog/2021/01/23/firecracker--start-a-vm-in-less-than-a-second/
// https://github.com/firecracker-microvm/firecracker/blob/fea3897ccfab0387ce5cd4fa2dd49d869729d612/docs/getting-started.md#getting-the-firecracker-binary

@injectable()
export class FirecrackerSandboxProvider implements SandboxProvider {
  constructor() {}

  up(_payload: SandboxProvisionInput): Promise<SandboxRuntime> {
    throw new Error("Method not implemented.");
  }

  down(_instanceId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
