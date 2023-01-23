import * as Discord from "discord.js";
import { generateSlug } from "random-word-slugs";
import CommandClient from "../classes/CommandClient";
import Game from "../classes/Game";
import { WordSelector } from "../classes/WordSelector";

module.exports = {
    name: 'submit',
    aliases: [],
    description: "Submit two words for the bot to GM with.",
    args: false,
    execute(message: Discord.Message, args: string[]){

        args = args.filter( arg => arg.toLowerCase() === "-g" || arg.toLowerCase() === "-r");

        let allowForBotUse = false;

        if(args.includes("-g")){
            args = args.filter( arg => arg !== "-g");
            allowForBotUse = true;
        }

        if(args.includes("-r")){
            args.filter( arg => arg !== "-r");

            (message.client as CommandClient).database?.SubmitWordPair(message.author.id, WordSelector.RandomWords(), allowForBotUse)
                .then((validSubmission) => {
                    message.reply(validSubmission ? "Random submission accepted!" : "Invalid word submission.");
                });

            return;

        }

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
                    });

            });
    }
}