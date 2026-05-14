import { injectable } from "tsyringe";

import { dbEngines } from "@common/const/engines";

@injectable()
export class GenericService {
  public getSupportedEngines() {
    const engines = dbEngines.filter((engine) => engine.is_supported);

    return {
      status: true,
      message: "Supported engines retrieved successfully",
      data: engines,
    };
  }
}
