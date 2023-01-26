import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'leave',
    aliases: ['l'],
    description: "Leave a Wolf Lobby.",
    args: false,
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){
        (message.client as CommandClient).lobbies.get(message.guild!)!.leave(message.author);
    }
} as ICommand;