#!/usr/bin/env node
import * as minimist from "minimist";
import SSRizeServer from "./SSRizeServer";

const [, , ...args] = process.argv;
const ssrizeArgs = minimist(args);

if (args.length > 0) {
  const server = new SSRizeServer({
    port: ssrizeArgs.p || ssrizeArgs.port,
    path: ssrizeArgs._.length > 0 ? ssrizeArgs._[0] : "."
  });
  server.start();
}
