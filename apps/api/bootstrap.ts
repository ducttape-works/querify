import { dbConnect } from "./db/connector";

export const bootstrap = () => {
  dbConnect();
};
