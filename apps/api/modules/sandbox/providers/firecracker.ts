import { injectable } from "tsyringe";

import {
  SandboxProvisionInput,
  SandboxRuntime,
  SandboxExecutionResult,
  SandboxProvider,
  SandboxQuery,
} from "@common/types/sandbox-provider";

// https://jvns.ca/blog/2021/01/23/firecracker--start-a-vm-in-less-than-a-second/
// https://github.com/firecracker-microvm/firecracker/blob/fea3897ccfab0387ce5cd4fa2dd49d869729d612/docs/getting-started.md#getting-the-firecracker-binary

@injectable()
export class FirecrackerSandboxProvider implements SandboxProvider {
  up(_payload: SandboxProvisionInput): Promise<SandboxRuntime> {
    throw new Error("Method not implemented.");
  }

  down(_instanceId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  execute(_payload: SandboxQuery): Promise<SandboxExecutionResult> {
    throw new Error("Method not implemented.");
  }
}
