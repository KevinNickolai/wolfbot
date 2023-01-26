import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { Roles } from "../classes/Game";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'spoof',
    aliases: [],
    description: "Spoof a Word Wolf game",
    args: false,
    guildOnly: true,
    flags: ["-w"],
    execute(message: Discord.Message, args: string[]){

        args = args.filter(arg => this.flags?.includes(arg));



        const will = args.includes("-w");
        const gm = will ? message.guild?.ownerId! : message.author.id;

        (message.client as CommandClient).database.GenerateGame(message.guildId!, gm)
            .then(async (gameId) => {

                const wordsAvailable = (await (message.client as CommandClient).database.QueryForWordPair([], gameId))??(await (message.client as CommandClient).database.GetUserWordPair(gm, gameId));

                if(typeof wordsAvailable === 'undefined'){
                    return message.reply("There aren't any available words to play with!");
                }


                let members = new Discord.Collection<string, Discord.GuildMember>();

                const userCount = Math.floor(Math.random() * 4) + 3 - (will ? 1 : 0);

                let availablePool = message.guild?.members.cache.filter( u => u.id !== gm);

                if(will){
                    members.set(message.author.id, message.guild?.members.cache.get(message.author.id)!);
                    availablePool?.delete(message.author.id);
                }

                for(let i = 0; i < userCount; ++i){

                    const place = Math.floor(Math.random() * availablePool!.size);

                    let member = availablePool?.random()!;

                    members.set(member.id, member);

                    availablePool?.delete(member.id)
                }


                let roleUsers = new Map<string, Roles>();

                let minority = Math.floor(Math.random() * members.size);

                let i = 0;
                for(const member of members){
                    roleUsers.set(member[0], i !== minority ? Roles.Majority : Roles.Minority);
                    ++i;
                }


                (message.client as CommandClient).database.SetGameUsers(gameId, roleUsers)
                    .then(() => {

                        let winners = [];
                        const winnerMajority = Math.floor(Math.random() * 2) === 1;

                        for(const [id, role] of roleUsers){
                            if(winnerMajority && role === Roles.Majority){
                                winners.push(id);        
                            }

                            if(!winnerMajority && role === Roles.Minority){
                                winners.push(id);
                            }

                        }

                        (message.client as CommandClient).database.SetWinners(gameId, winners)
                            .then(() => {
                                message.reply("Game spoofed! WOW that was a lot of fun!");
                            });
                    });
            });


    }

} as ICommand;