import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import autoload from "@fastify/autoload";
import staticFiles from "@fastify/static";
import type { Client } from "discord.js";
import { env, logger } from "#settings";
import ck from "chalk";
import path from "node:path";
import { serverErrorHandler } from "#functions";

export async function startServer(client: Client<true>){
    const app = fastify();
    app.addHook("onRoute", route => {
        if (route.method === "HEAD" || route.method === "OPTIONS") return;
        logger.success(`${ck.yellow(route.method)} ${ck.blue(route.path)}`);
    });
    app.register(cors, { origin: "*" });
    const isProduction = process.env.NODE_ENV === 'production';
    const assetsPath = isProduction 
        ? path.join(process.cwd(), 'build', 'server', 'routes', 'assets')
        : path.join(import.meta.dirname, "routes", "assets");
    app.register(staticFiles, {
        root: assetsPath,
        prefix: "/assets/"
    });
    app.register(autoload, {
        dir: path.join(import.meta.dirname, "routes"),
        routeParams: true,
        options: client,
    });
    app.setErrorHandler(serverErrorHandler)
    const port = process.env.NODE_ENV === 'production' ? 8080 : Number(env.SERVER_PORT ?? 3000);

    await app.listen({ port, host: "0.0.0.0" })
    .catch(err => {
        logger.error(err);
        process.exit(1);
    });
    logger.log(ck.green(`● ${ck.underline("Fastify")} server listening on port ${port}`));
}

export type RouteHandler = (app: FastifyInstance, client: Client<true>, done: Function) => any;
export function defineRoutes(handler: RouteHandler){
    return (...[app, client, done]: Parameters<RouteHandler>) => {
        handler(app, client, done);
        done();
    }
}