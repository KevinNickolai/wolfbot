import client from "./client";
import * as config from "./config";
main();

async function main() {
    Promise.all([client.login(config.botToken), client.database.init()]).then(() => {
        console.log("Logged in!");
    });
}