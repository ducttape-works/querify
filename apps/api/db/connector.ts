import Knex, { Knex as IKnex } from "knex";
import { Model } from "objection";

import knexConfig from "../knexfile";

let knex: IKnex;

export const dbConnect = () => {
  knex = Knex(knexConfig);
  Model.knex(knex);
};

export const dbDisconnect = async () => {
  if (knex) await knex.destroy();
};
