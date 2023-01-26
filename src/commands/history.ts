import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";
import { IGameHistory } from "../interfaces/IHistory";

export default {
    name: 'history',
    aliases: [],
    description: "View your Word Wolf stats.",
    args: false,
    guildOnly: false,
    execute(message: Discord.Message, args: string[]){
        (message.client as CommandClient).database.GetHistory(message.author.id)
            .then((history) => {
                let msgHistory = `Game History for <@${message.author.id}>:\n`;

                for(const game of history.games){
                    msgHistory += `GM: <@${game.gameMasterId}> of ${game.playerCount} players on ${game.playedOn.toDateString()}.\n` +
                                `Words: ||${game.words.majorityWord}|| | ||${game.words.minorityWord}||. Role: ${game.role}, ${game.win ? "Win" : "Loss"}\n`;
                }

                message.reply({content: msgHistory, allowedMentions: {
                    "parse": []
                }});
            })
    }
} as ICommand;