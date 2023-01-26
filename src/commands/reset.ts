import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'reset',
    aliases: ['r'],
    description: "Reset a Wolf Lobby.",
    args: false,
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){
        //(message.client as CommandClient).games.delete(message.guild!);
    }
} as ICommand;