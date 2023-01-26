import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import Game from "../classes/Game";
import { ICommand } from "../interfaces/ICommand";

export default {
    name: 'start',
    aliases: ['s'],
    description: "start a game of Wolf",
    args: false,
    guildOnly: true,
    execute(message: Discord.Message, args: string[]){

        let currentGame = (message.client as CommandClient).games.get(message.guild!);

        if(typeof currentGame === 'undefined'){

            let lobby = (message.client as CommandClient).lobbies.get(message.guild!)!;

            let gmQL = lobby.gameMasterQueue.length;

            let pQL = lobby.playerQueue.length;

            let usersBusy = false;

            for(const [usr, listening] of (lobby.guild.client as CommandClient).listeningForResponses){
                usersBusy = typeof lobby.playerQueue.find(u => u === usr) !== 'undefined' ||
                            typeof lobby.gameMasterQueue.find(u => u === usr) !== 'undefined';
                if(usersBusy) break;
            }

            if(usersBusy) return message.reply(`A player is currently busy in a command. Please wait for them to finish and try to start again.`);

            if((gmQL > 0 && (gmQL - 1 + pQL) > 2) || pQL > 2){

                lobby.playerQueue.map(u => (message.client as CommandClient).listeningForResponses.set(u, true));
                lobby.gameMasterQueue.map(u => (message.client as CommandClient).listeningForResponses.set(u, true));

                (message.client as CommandClient).games.set(message.guild!, new Game(lobby));

                lobby.Clear();
    
                console.log("Game Started");
                console.log((message.client as CommandClient).games.get(message.guild!));
            }
            else{
                message.reply(`Not enough players to start: Current player count is ${gmQL > 0 ? gmQL - 1 + pQL : pQL}`);
            }
        }
    }
} as ICommand;