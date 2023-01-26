import * as Discord from "discord.js";
import { generateSlug } from "random-word-slugs";
import CommandClient from "../classes/CommandClient";
import Game from "../classes/Game";
import { WordSelector } from "../classes/WordSelector";
import { prefix } from "../config";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'submit',
    aliases: [],
    description: "Submit two words for the bot to GM with.",
    args: false,
    flags: ["-g", "-r", "-ra"],
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){
        args = args.filter( arg => this.flags?.includes(arg) );

        let allowForBotUse = false;

        if(args.includes("-g")){
            args = args.filter( arg => arg !== "-g");
            allowForBotUse = true;
        }

        const randomAll = args.includes("-ra");

        if(randomAll || args.includes("-r")){
            (message.client as CommandClient).database?.SubmitWordPair(message.author.id, WordSelector.RandomWords(true, !randomAll), allowForBotUse)
                .then((validSubmission) => {
                    message.reply(validSubmission ? "Random submission accepted!" : "Invalid word submission.");
                });

            return;

        }


        (message.client as CommandClient).listeningForResponses.set(message.author, true);
        message.reply("Please give me 2 words formatted as: 'Majority Word | Minority Word'")
            .then(() => {

                message.channel.awaitMessages( { max: 1, filter: (msg: Discord.Message) => message.author === msg.author &&
                                                                                            WordSelector.Validate(msg.content) })
                    .then(async (msg) => {
                        const words = WordSelector.ExtractWords(msg.at(0)?.content!)!;

                        const validSubmission = await (message.client as CommandClient).database?.SubmitWordPair(message.author.id, words, allowForBotUse);
                        
                        if(validSubmission){
                            msg.at(0)?.reply("Valid word submission accepted!");
                        }
                        else{
                            msg.at(0)?.reply("Invalid word submission.");
                        }

                        (message.client as CommandClient).listeningForResponses.delete(message.author);
                    });

            });

        
    }
} as ICommand;