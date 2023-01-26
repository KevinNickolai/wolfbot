import * as Discord from "discord.js";
import CommandClient from "./CommandClient";
import Lobby from "./Lobby";
import { WordSelector, WordPair } from "./WordSelector";

export enum Roles {
    Minority = "minority",
    Majority = "majority"
}

/* TODO:
* 6 players MAX for alternative gamemode where everyone gets a unique word.
* EVERYONE option for alternative game mode where @ end of game 
*/

function msgFilterWordSelectionOnly(msg : Discord.Message) : boolean {
    return WordSelector.Validate(msg.content);
}

function msgFilterWordSubmission(msg : Discord.Message) : boolean {
    return msg.content.trim().toLowerCase() === "-r" || msgFilterWordSelectionOnly(msg);
}

function msgFilterYN(msg : Discord.Message) : boolean {
    return msg.content === 'Y' || msg.content === 'N';
}

function msgFilterEnd(msg : Discord.Message) : boolean{
    return msg.content === 'end';
}

export default class Game {

    public gameMaster : Discord.User

    public players : Discord.User[];

    public allPlayers : Discord.User[];

    public words!: WordPair;

    public minority : Discord.User | undefined;

    private lobby : Lobby;

    constructor(lobby : Lobby){

        this.gameMaster = lobby.DecideGameMaster();
        this.players = lobby.gameMasterQueue.concat(lobby.playerQueue);
        this.allPlayers = this.players;
        this.lobby = lobby;

        this.Run();
        
    }

    /**
     * Initialize majority/minority words for the current game
     * @returns {Promise<void>} upon completion of the initialization of the majority/minority words
     */
    private async InitializeWords(gameId: number) : Promise<void>{
        /*
        * Request words from the GM or generate them from the bot
        */
        if(this.gameMaster !== this.lobby.guild.client.user){

            return this.gameMaster.createDM()
                .then(async (dmc) =>  { 

                    await dmc.send("You're the GM! Please give me 2 words formatted as: 'Majority Word | Minority Word', or send '-r' to select your word pairs randomly from the database!");

                    return dmc.awaitMessages( { max: 1, filter: msgFilterWordSubmission } );
                })
                .then(async (msg) =>{
                    if(msg.at(0)?.content.trim().toLowerCase() === "-r"){
                        let words = await (this.lobby.guild.client as CommandClient).database?.GetUserWordPair(this.gameMaster.id, gameId);

                        if(typeof words !== 'undefined') {
                            this.words = words;
                            return;
                        }
                        msg.at(0)?.reply("You have no submitted words! Please give me 2 words formatted as: 'Majority Word | Minority Word'.");

                        let resubmission = await msg.at(0)?.channel.awaitMessages( { max: 1, filter: msgFilterWordSelectionOnly })

                        this.words = WordSelector.ExtractWords(resubmission?.at(0)?.content!)!;

                        (this.lobby.guild.client as CommandClient).database.CreateSpontaneousWordPair(this.gameMaster.id, this.words, gameId);
                    }else{
                        this.words = WordSelector.ExtractWords(msg.at(0)?.content!)!;
                        
                        (this.lobby.guild.client as CommandClient).database.CreateSpontaneousWordPair(this.gameMaster.id, this.words, gameId);
                    }

                    return;
                });
        }
        else{

            const playerUserIds = this.players.map<string>((user) => user.id );

            return (this.lobby.guild.client as CommandClient).database?.QueryForWordPair(playerUserIds, gameId)
                    .then((words) => { this.words = words??WordSelector.RandomWords(); })!;
        }
    }

    private async Run() {

        let timeout : NodeJS.Timeout;

        let playersList = "";

        let i = 1
        this.players.forEach(element => {
            playersList += `${i++}: ` + element.tag + ", ";
        });

        let playerDMs = this.players.map( async (usr: Discord.User) : Promise<void> => {
            const completeUser = await usr.fetch();

            (await completeUser.createDM())
                .send(`You're a player! The GM is ${this.gameMaster.tag}.
                Awaiting their selection of words...
                Players: ${playersList}`);


            return;
        });

        const gameId = await (this.lobby.guild.client as CommandClient).database.GenerateGame(this.lobby.guild.id, this.gameMaster.id);

        this.allPlayers = this.players;

        await this.InitializeWords(gameId)
            .then(() => {
                if(this.gameMaster !== this.lobby.guild.client.user){
                    this.gameMaster.createDM()
                        .then(async (dmc) => {
                            dmc.send("Select Minority? (Y/N)");

                            const choice = await dmc.awaitMessages( {max: 1, filter: msgFilterYN })
                                        .then((msg) => msg.at(0)!.content === 'Y')
                            
                            if(choice){
                                dmc.send(playersList);

                                const msgfilternum = (msg: Discord.Message) => {
                                    if(!isNaN(parseInt(msg.content)) &&
                                        parseInt(msg.content) >= 1 &&
                                        parseInt(msg.content) <= this.players.length){
                                        return true;
                                    }
        
                                    return false;
                                }

                                const selectionMessage = (await dmc.awaitMessages( { max: 1, filter: msgfilternum })).at(0)?.content!

                                this.minority = this.players[parseInt(selectionMessage)];
                                this.players = this.players.filter( u => u !== this.minority );

                            }
                        })
                }
                else{
                    this.minority = this.players[Math.floor(Math.random() * this.players.length)];
                    this.players = this.players.filter( u => u !== this.minority );
                }
            });

        
        let userIdToRoles = new Map<string, Roles>();

        this.players.map(async (majorityPlayer) => {

            userIdToRoles.set(majorityPlayer.id, Roles.Majority);

            return majorityPlayer.createDM().then((dmc) => dmc.send(`Your word is ${this.words.majorityWord}.`));
        });

        userIdToRoles.set(this.minority!.id, Roles.Minority);
        this.minority!.createDM().then((dmc) => dmc.send(`Your word is ${this.words.minorityWord}.`));
        
        (this.lobby.guild.client as CommandClient).database.SetGameUsers(gameId, userIdToRoles);

        timeout = setTimeout(() => {
            this.EndGame(gameId);
        }, 10*60*1000);

        
        if(this.gameMaster !== this.lobby.guild.client.user){

            this.gameMaster.createDM().then((dmc) =>{
                dmc.send(`The minority player is ${this.minority?.tag} with ${this.words.minorityWord}. Starting 10 minute clock... (Stop the clock and end the game by typing 'end')`);
            
                dmc.awaitMessages( { max: 1, filter: msgFilterEnd, time: 9*60*1000  } ).then(() => {

                    if(typeof timeout !== 'undefined'){
                        clearTimeout(timeout);
                        this.EndGame(gameId);
                    }
                });
            });
        }
    }

    private async CollectVotes() : Promise<Map<Discord.User, number>>{

        let votes = new Map<Discord.User, number>();

        let playersList = ""

        let i = 1
        const playerListings = this.allPlayers.map(async (player) => {
            playersList += `${i++}: ` + player.tag + ", ";
            votes.set(player, 0);
        });

        await Promise.all(playerListings);

        const msgfilternum = (msg: Discord.Message) => {
            return !isNaN(parseInt(msg.content)) && 
                    parseInt(msg.content) >= 1 &&
                    parseInt(msg.content) < i;
        }

        const voteCollection = this.allPlayers.map(async (player) => {
            const dmc = await player.createDM();

            dmc.send(`Vote for your selection for the minority:\n${playersList}`)
            
            await dmc.awaitMessages( { max: 1, filter: msgfilternum })
                .then((msg) =>{
                    const votedPlayer = this.allPlayers[parseInt(msg.at(0)!.content) - 1];
                    votes.set(votedPlayer, votes.get(votedPlayer)!+1);
                });
        });

        await Promise.all(voteCollection);

        return votes;

    }

    async EndGame(gameId: number){

        if(this.gameMaster !== this.gameMaster.client.user){
            this.gameMaster.createDM().then((dmc) => {
                dmc.send("Game Time is up! Notify the players.");
            });
        }

        const votes = await this.CollectVotes();

        let votedMsg = ""

        let majorityWin = votes.get(this.minority!)! > Math.floor(this.allPlayers.length / 2);

        for(const [player, voteCount] of votes){
            votedMsg += `${player.tag}: ${voteCount} vote(s).\n`;
        }

        if(majorityWin){
            votedMsg += `${this.minority?.tag} the minority has been discovered!
            Input if they guess the correct majority word. (Y/N)`;
        } 
        else{
            votedMsg += `${this.minority?.tag} the minority has won!`;
        }

        if(this.gameMaster !== this.gameMaster.client.user){
            this.gameMaster.createDM().then(async (dmc) =>{
                await dmc.send(votedMsg);

                if(majorityWin){
                    majorityWin = await dmc.awaitMessages({ max: 1, filter: msgFilterYN })
                    .then( msg => msg.at(0)!.content !== 'Y' );
                }

                // Write game win
                if(majorityWin){
                    await (this.lobby.guild.client as CommandClient).database.SetWinners(gameId, this.players.map(p => p.id));
                }
                else{
                    await (this.lobby.guild.client as CommandClient).database.SetWinners(gameId, [ this.minority!.id ])
                }
                
                this.allPlayers.map(usr => (this.lobby.guild.client as CommandClient).listeningForResponses.delete(usr));
                
                (this.lobby.guild.client as CommandClient).listeningForResponses.delete(this.gameMaster);
            });
        }
        else{

            let minorityWinVotes = 0;

            let winVotes = this.allPlayers.map(async (player) => {
                let dmc = await player.createDM();

                dmc.send(votedMsg);

                if(majorityWin && 
                   await dmc.awaitMessages({ max: 1, filter: msgFilterYN })
                            .then( msg => msg.at(0)!.content === 'Y' )){
                    ++minorityWinVotes
                }

                return;
            });

            await Promise.all(winVotes);

            majorityWin = minorityWinVotes >= Math.floor(this.players.length / 2);
            

            // Write game win

            if(majorityWin){
                await (this.lobby.guild.client as CommandClient).database.SetWinners(gameId, this.players.map(p => p.id));
            }
            else{
                await (this.lobby.guild.client as CommandClient).database.SetWinners(gameId, [ this.minority!.id ])
            }

            
            this.allPlayers.map(usr => (this.lobby.guild.client as CommandClient).listeningForResponses.delete(usr));

            (this.lobby.guild.client as CommandClient).listeningForResponses.delete(this.gameMaster);
        }

    }

}