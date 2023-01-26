import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'join',
    aliases: ['j'],
    description: "Join a game of Wolf",
    args: false,
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){
        if(!args.length || args[0] !== 'gm'){
            (message.client as CommandClient).lobbies.get(message.guild!)!.join(message.author);
            message.react('🐺');
        }
        else{
            (message.client as CommandClient).lobbies.get(message.guild!)!.joinGM(message.author);
            message.react('🎲');
        }
    }
} as ICommand;