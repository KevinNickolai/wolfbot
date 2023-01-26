import * as Discord from "discord.js"
import CommandClient from "./classes/CommandClient";
import fs from 'fs';
import { promisify } from 'util';
import Lobby from "./classes/Lobby";

const readdirAsync  = promisify(fs.readdir);

const client = new CommandClient({ intents: [Discord.Intents.FLAGS.GUILDS,
     Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.DIRECT_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
Discord.Intents.FLAGS.GUILD_PRESENCES], 
    partials: [ "CHANNEL" ] /// Required for DMs
    });

client.guilds.fetch()
        .then((guilds) => {
            guilds.map( oAuth2G => oAuth2G.fetch().then( guild => client.lobbies.set(guild, new Lobby(guild)) ));
        });

/*
* Read in commands into the CommandClient
*/
readdirAsync('./dist/commands')
    .then((files : string[]) =>{

        const commandFiles = files.filter(file => file.endsWith('.js'));

        commandFiles.forEach(file => {
            const command = require(`../dist/commands/${file}`).default;

            client.commands.set(command.name, command);
        });

    })
    .catch((error: Error) => {
        console.log(error);
    });
    
/*
* Read in events to process in Discord
*/
readdirAsync('./dist/events')
    .then((files : string[]) => {
        const eventFiles = files.filter(file => file.endsWith('.js'));

        eventFiles.forEach(file => {

            const eventHandler = require(`../dist/events/${file}`);
            const eventName = file.split(".")[0];

            if(eventName === "ready"){
                client.once(eventName, (...args : any[]) => eventHandler(client, ...args));
            } else {
                client.on(eventName, (...args : any[]) => eventHandler(client, ...args));
            }

        })
    })
    .catch((error : Error) =>{
        console.log(error);
    });

export default client;

