import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import autoload from "@fastify/autoload";
import type { Client } from "discord.js";
import { env, logger } from "#settings";
import ck from "chalk";
import path from "node:path";
import { csrfProtection } from "./middleware/csrf.js";
import { rateLimiter } from "#functions";

export async function startServer(client: Client<true>){
    const app = fastify();
    
    // Add security middleware
    app.addHook("preHandler", async (request, reply) => {
        // Rate limiting for API requests
        const clientIp = request.ip || 'unknown';
        const rateLimitResult = rateLimiter.checkLimit(clientIp, 'api');
        
        if (!rateLimitResult.allowed) {
            const resetTime = Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000);
            reply.status(429).send({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again in ${resetTime} seconds.`,
                retryAfter: resetTime
            });
            return;
        }
        
        // CSRF protection for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
            const csrfResult = csrfProtection(request, reply);
            if (!csrfResult.valid) {
                reply.status(403).send({
                    error: 'CSRF Token Invalid',
                    message: 'Invalid or missing CSRF token'
                });
                return;
            }
        }
    });
    
    app.addHook("onRoute", route => {
        if (route.method === "HEAD" || route.method === "OPTIONS") return;
        logger.success(`${ck.yellow(route.method)} ${ck.blue(route.path)}`);
    });
    
    app.register(cookie);
    
    app.register(cors, { 
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        credentials: true
    });
    
    app.register(autoload, {
        dir: path.join(import.meta.dirname, "routes"),
        routeParams: true,
        options: client,
    });

    const port = Number(env.SERVER_PORT ?? 3000);

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