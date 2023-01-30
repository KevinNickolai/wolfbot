import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'spectate',
    aliases: ['s'],
    description: "Spectate a Word Wolf Lobby.",
    args: false,
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){
        let game = (message.client as CommandClient).games.get(message.guild!);
        let gamePlayers = game?.allPlayers;

        if(typeof game !== 'undefined' && 
        typeof gamePlayers !== 'undefined' && 
        typeof gamePlayers.find( u => u === message.author) === 'undefined'){
            message.author.createDM().then((dmc) => {
                let playerList = "";

                gamePlayers?.forEach((plyr) => {
                    playerList += plyr.tag + ", ";
                });

                dmc.send(`GM: ${game?.gameMaster}\nPlayers: ${playerList}\nMajority Word: ||${game?.words.majorityWord}||\nMinority Word: ||${game?.words.minorityWord}||\nMinority: ||${game?.minority?.tag}||`)
            });
        }
    }
} as ICommand;