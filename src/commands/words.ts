import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'words',
    aliases: [],
    description: "View your submitted words.",
    args: false,
    execute(message: Discord.Message, args: string[]){
        (message.client as CommandClient).database.ViewWordPairs(message.author.id)
            .then(async (wordsHistory) => {
                const dmc = await message.author.createDM();

                let formattedHistory = "Your word pairs:\n";

                for(const whist of wordsHistory.words){
                    formattedHistory += `(${whist.majorityWord} | ${whist.minorityWord}), ${whist.createdAt.toDateString()}${whist.gameId ? ", Played" : ""}\n`; 
                }

                dmc.send(formattedHistory);
            });


    }
} as ICommand;