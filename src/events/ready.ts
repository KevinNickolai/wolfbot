import CommandClient from "../classes/CommandClient";

module.exports = (client: CommandClient) => {

    if(client.user) {
        console.log(`Logged in as ${client.user.tag}!`);
    }

    console.log(`Starting game across ${client.guilds.cache.size} servers.`);

}