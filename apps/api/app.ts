import "reflect-metadata";
import { container, singleton } from "tsyringe";
import express from "express";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";

import routes from "./common/routes";
import {
  globalErrorHandler,
  routeNotFoundHandler,
} from "./common/routes/others";
import { cookieInterceptor } from "./common/interceptors/cookie.interceptor";
import { bootstrap } from "./bootstrap";
import { DockerSandboxProvider } from "@modules/sandbox/providers/docker";

@singleton()
export default class Application {
  private readonly app: express.Application;
  private _instance_!: http.Server;

  constructor() {
    this.app = express();
    this.registerMiddlewares();
  }

  public async startUp(port: number) {
    await bootstrap();
    this._instance_ = this.app.listen(port);
  }

  public async shutDown() {
    if (this._instance_) await this._instance_.close();
    await container.resolve(DockerSandboxProvider).pruneManagedContainers();
  }

  private registerMiddlewares() {
    this.app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
    this.app.use(cookieParser());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieInterceptor);

    routes(this.app);

    this.app.use(routeNotFoundHandler);
    this.app.use(globalErrorHandler);
  }
}
