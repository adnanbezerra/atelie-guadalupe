import { join } from "node:path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import { validateEnv } from "./config/env";
import { loggerOptions } from "./config/logger";

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = { logger: loggerOptions };

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
    validateEnv();

    fastify.register(AutoLoad, {
        dir: join(__dirname, "plugins"),
        options: opts
    });

    fastify.register(AutoLoad, {
        dir: join(__dirname, "routes"),
        options: opts
    });
};

export default app;
export { app, options };
