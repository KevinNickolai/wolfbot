import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import Game from "../classes/Game";

module.exports = {
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

            if((gmQL > 0 && (gmQL - 1 + pQL) > 2) || pQL > 2){
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
}