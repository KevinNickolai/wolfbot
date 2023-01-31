import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { HISTORY_GAME_COUNT } from "../classes/database/DBManager";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'history',
    aliases: [],
    description: "View your Word Wolf stats.",
    args: false,
    guildOnly: false,
    flags: ["-s"],
    execute(message: Discord.Message, args: string[]){

        const spoofed = args.includes("-s");

        (message.client as CommandClient).database.GetHistory(message.author.id, HISTORY_GAME_COUNT, spoofed)
            .then((history) => {
                let msgHistory = `Game History for <@${message.author.id}>:\n`;

                for(const game of history.games){
                    msgHistory += `GM: <@${game.gameMasterId}> of ${game.playerCount} players on ${game.playedOn.toDateString()}.\n` +
                                `Words: ||${game.words.majorityWord}|| | ||${game.words.minorityWord}||. Role: ${game.role}, ${game.win ? "Win" : "Loss"}\n`;
                }

                message.reply({content: msgHistory, allowedMentions: {
                    "parse": []
                }});
            });
    }
} as ICommand;