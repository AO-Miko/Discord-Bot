import { bootstrap } from "#base";
import { startServer } from "#server";
import 'dotenv/config';

await bootstrap({ 
    meta: import.meta,
    whenReady: startServer
});