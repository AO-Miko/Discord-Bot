import { z } from "zod";

export const envSchema = z.object({
    BOT_TOKEN: z.string({ description: "Discord Bot Token is required" }).min(1),
    WEBHOOK_LOGS_URL: z.string().url().optional(),
    SERVER_PORT: z.string().refine(v => !Number.isNaN(Number(v)), "Invalid server port").optional(),
    // Env vars...
    BOT_OWNER_ID: z.string().refine(v => !Number.isNaN(Number(v)), "Invalid bot owner id").optional(),
});