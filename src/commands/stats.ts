import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'stats',
    aliases: [],
    description: "View your Word Wolf stats.",
    args: false,
    guildOnly: false,
    flags: ["-t"],
    execute(message: Discord.Message, args: string[]){
        
        const tabular = args.includes("-t");

        (message.client as CommandClient).database.GetStats(message.author.id)
            .then((stats) => {

                const winsColumnPadding = Math.max(
                                                    "Wins".length, 
                                                    stats.allGames.wins.toString().length //< allGames.wins is going to always be the longest digit string in the column.
                                                );


                const gpColumnPadding = Math.max("GP".length, stats.allGames.gamesPlayed.toString().length);

                const wPctColumnPadding = 4; //< Win% stats will always be 2 digits, in this case the header will be length 4, always the max for padding.

                const statLayout = tabular ? 
                (`[CATEGORY]: ${"Wins".padEnd(winsColumnPadding)}\t${"GP".padEnd(gpColumnPadding)}\tWin%\n` +
                `[MAJORITY]: ${stats.majorityGames.wins.toString().padEnd(winsColumnPadding)}\t` +
                            `${stats.majorityGames.gamesPlayed.toString().padEnd(gpColumnPadding)}\t` + 
                            `${Math.floor(stats.majorityGames.winPercentage*100).toString().padEnd(wPctColumnPadding)}\n` +
                `[MINORITY]: ${stats.minorityGames.wins.toString().padEnd(winsColumnPadding)}\t` + 
                            `${stats.minorityGames.gamesPlayed.toString().padEnd(gpColumnPadding)}\t` + 
                            `${Math.floor(stats.minorityGames.winPercentage*100).toString().padEnd(wPctColumnPadding)}\n` +
                `[ALLROLES]: ${stats.allGames.wins.toString().padEnd(winsColumnPadding)}\t` + 
                            `${stats.allGames.gamesPlayed.toString().padEnd(gpColumnPadding)}\t` +
                            `${Math.floor(stats.allGames.winPercentage*100).toString().padEnd(wPctColumnPadding)}`)
                :
                (`[MAJORITY]: Wins: ${stats.majorityGames.wins}\tGP: ${stats.majorityGames.gamesPlayed}\tWin%: ${Math.floor(stats.majorityGames.winPercentage*100)}%\n` +
                `[MINORITY]: Wins: ${stats.minorityGames.wins}\tGP: ${stats.minorityGames.gamesPlayed}\tWin%: ${Math.floor(stats.minorityGames.winPercentage*100)}%\n` +
                `[ALLROLES]: Wins: ${stats.allGames.wins}\tGP: ${stats.allGames.gamesPlayed}\tWin%: ${Math.floor(stats.allGames.winPercentage*100)}%`);

                message.reply("```Your Stats:\n" +
                `[WORDPAIR]: GMGP: ${stats.gamesGM}\tSubmitted: ${stats.wordPairsSubmitted}\n` +
                statLayout + "```");


                // todo: fix formatting and have tabular display of stats, flag argument?

                


            });

    }
} as ICommand;