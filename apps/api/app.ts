import "reflect-metadata";
import { singleton } from "tsyringe";
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

@singleton()
export default class Application {
  private readonly app: express.Application;
  private _instance_!: http.Server;

  constructor() {
    this.app = express();
    this.registerMiddlewares();
    bootstrap();
  }

  public async startUp(port: number) {
    this._instance_ = this.app.listen(port);
  }

  public async shutDown() {
    if (this._instance_) await this._instance_.close();
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
