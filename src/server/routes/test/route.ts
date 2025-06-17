import { defineRoutes } from "#server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

export default defineRoutes((app, client) => {
    const creatSubscriptionBodySchema = z.object({
        guildId: z.string().min(1),
        member: z.string().min(1),
        role: z.string().min(1),
    });
    app.post("/", async (req, reply) => {
        const body = creatSubscriptionBodySchema.parse(req.body);

        const guild = await client.guilds.fetch(body.guildId).catch(() => null);
        if (!guild) {
            return reply.status(StatusCodes.NOT_FOUND).send({
                message: "Guild not found",
            });
        }
        const member = await guild.members.fetch(body.member).catch(() => null);
        if (!member) {
            return reply.status(StatusCodes.NOT_FOUND).send({
                message: "member not found",
            });
        }
        const role = await guild.roles.fetch(body.role).catch(() => null);
        if (!role) {
            return reply.status(StatusCodes.NOT_FOUND).send({
                message: "role not found",
            });
        }
        await member.roles.add(role);
        return reply.status(StatusCodes.CREATED).send({
            message: `Member ${member.displayName} has been given the ${role.name} role in the ${guild.name} guild`
        });
    });
});