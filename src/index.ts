import { MessageComponentInteraction } from "discord.js";
import client from "./client";
import * as config from "./config";
import { DBManager } from "./classes/database/DBManager";
main();

async function main() {
    Promise.all([client.login(config.botToken), client.database.init()]).then(() => {
        console.log("Logged in!");
    });
}