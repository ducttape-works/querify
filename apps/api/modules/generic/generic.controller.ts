import { injectable } from "tsyringe";
import { Request, Response } from "express";

import { genericResponse } from "@common/utils/http";
import { GenericService } from "./generic.service";

@injectable()
export class GenericController {
  constructor(private readonly genericService: GenericService) {}

  getSupportedEngines = async (_request: Request, response: Response) => {
    const data = this.genericService.getSupportedEngines();
    return genericResponse({ response, data });
  };
}
