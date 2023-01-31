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

/**
 * Message filter for word selection
 * @param msg Discord Message to filter
 * @returns {boolean} true if message content is a valid format for WordSelector parsing, false otherwise.
 */
function msgFilterWordSelectionOnly(msg : Discord.Message) : boolean {
    return WordSelector.Validate(msg.content);
}

/**
 * Message filter for either valid word selection or flags indicating a randomized word selection
 * @param msg Discord Message to filter
 * @returns {boolean} true if valid randomization flag or valid word selection, false otherwise.
 */
function msgFilterWordSubmission(msg : Discord.Message) : boolean {
    return msg.content.trim().toLowerCase() === "-r" ||
            msg.content.trim().toLowerCase() === "-ra" ||
            msg.content.trim().toLowerCase() === "-m" ||
            msgFilterWordSelectionOnly(msg);
}

/**
 * Yes / No message filter shorthand
 * @param msg Discord Message to filter
 * @returns {boolean} true if message content is shorthand Y/N for Yes/No
 */
function msgFilterYN(msg : Discord.Message) : boolean {
    return msg.content === 'Y' || msg.content === 'N';
}

/**
 * end message filter
 * @param msg Discord Message to filter
 * @returns {boolean} true if message content is exactly 'end', false otherwise.
 */
function msgFilterEnd(msg : Discord.Message) : boolean{
    return msg.content.toLowerCase() === 'end';
}

export default class Game {

    /**
     * Discord User of the Game Master
     */
    public gameMaster : Discord.User

    /**
     * Array of all players before the minority is selected,
     * Array of majority players only after minority is selected
     */
    public players : Discord.User[];

    /**
     * Array of all players during the duration of the game
     */
    public allPlayers : Discord.User[];


    /**
     *  The WordPair used for the game
     */
    public words!: WordPair;

    /**
     * Minority player, defined by the GM
     */
    public minority : Discord.User | undefined;

    /**
     * Lobby that the game starts from
     */
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

            const dmc = await this.gameMaster.createDM();

            await dmc.send(`You're the GM! Please response one of the following:
            'Majority Word | Minority Word'
            '-m' to pick from your pool of words randomly
            '-r' to pick from similar words randomly
            '-ra' to pick two random words from the same word category
            (2 minutes)`);

            const msg = await dmc.awaitMessages( { max: 1, filter: msgFilterWordSubmission, time: 60 * 2 * 1000}).catch(error => undefined);

            if(typeof msg === 'undefined'){
                dmc.send("Timeout limit reached: Selecting random words...");

                this.words = WordSelector.RandomWords(true, true);
            }
            else{
                const passedMessage = msg.at(0)?.content.trim().toLowerCase();

                if(passedMessage === "-m"){
                    const words = await (this.lobby.guild.client as CommandClient).database.GetUserWordPair(this.gameMaster.id, gameId);

                    if(typeof words !== 'undefined') {
                        this.words = words;
                    }else{
                        msg.at(0)?.reply("You have no submitted words! Please give me 2 words formatted as: 'Majority Word | Minority Word'. (2 minutes)");

                        const resubmission = await msg.at(0)?.channel.awaitMessages( { max: 1, filter: msgFilterWordSelectionOnly, time: 60 * 2 * 1000 }).catch(error => undefined);

                        if(typeof resubmission === 'undefined'){
                            dmc.send("Timeout limit reached: Selecting random words...");

                            this.words = WordSelector.RandomWords(true, true);
                        }
                        else{
                            this.words = WordSelector.ExtractWords(resubmission?.at(0)?.content!)!;
                        }
                    }

                }else if(passedMessage?.startsWith("-r")){
                    this.words = WordSelector.RandomWords(true, !passedMessage.includes("a"));
                }
                else{
                    this.words = WordSelector.ExtractWords(msg.at(0)?.content!)!;
                }
            }
        }
        else{
            const playerUserIds = this.players.map<string>((user) => user.id);

            this.words = (await (this.lobby.guild.client as CommandClient).database.QueryForWordPair(playerUserIds, gameId))??WordSelector.RandomWords();
        }

        await (this.lobby.guild.client as CommandClient).database.CreateSpontaneousWordPair(this.gameMaster.id, this.words, gameId);

        return;
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
                            dmc.send("Select Minority? (Y/N), (1 minute)");

                            const choice = await dmc.awaitMessages( {max: 1, filter: msgFilterYN, time: 60 * 1000 })
                                        .catch(error => undefined)
                                        .then((msg) => typeof msg !== 'undefined' && msg.at(0)!.content === 'Y')
                            
                            if(choice){
                                dmc.send(playersList + "\n(1 minute)");

                                const msgfilternum = (msg: Discord.Message) => {
                                    if(!isNaN(parseInt(msg.content)) &&
                                        parseInt(msg.content) >= 1 &&
                                        parseInt(msg.content) <= this.players.length){
                                        return true;
                                    }
        
                                    return false;
                                }

                                const response = await dmc.awaitMessages( { max: 1, filter: msgfilternum, time: 60 * 1000 }).catch(error => undefined)

                                const selectionNumber = typeof response !== 'undefined' ? 
                                                            parseInt(response.at(0)?.content!) :
                                                            Math.floor(Math.random() * this.players.length);

                                this.minority = this.players[selectionNumber];
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

        const majorityDMs = this.players.map(async (majorityPlayer) => {

            userIdToRoles.set(majorityPlayer.id, Roles.Majority);

            return majorityPlayer.createDM().then((dmc) => dmc.send(`Your word is ${this.words.majorityWord}.`));
        });

        userIdToRoles.set(this.minority!.id, Roles.Minority);
        const minorityDM = this.minority!.createDM().then((dmc) => dmc.send(`Your word is ${this.words.minorityWord}.`));
        
        await Promise.all(majorityDMs.concat(minorityDM));

        await (this.lobby.guild.client as CommandClient).database.SetGameUsers(gameId, userIdToRoles);
        
        if(this.gameMaster !== this.lobby.guild.client.user){

            this.gameMaster.createDM().then((dmc) =>{
                dmc.send(`The minority player is ${this.minority?.tag} with ${this.words.minorityWord}. The majority word is ${this.words.majorityWord}. Starting 10 minute clock... (Stop the clock and end the game by typing 'end')`);
            
                dmc.awaitMessages( { max: 1, filter: msgFilterEnd, time: 9*60*1000  } )
                    .then(() => {

                        if(typeof timeout !== 'undefined'){
                            clearTimeout(timeout);
                            this.EndGame(gameId);
                        }
                    })
                    .catch(error => {
                        // timeout error
                    });
            });
        }

        timeout = setTimeout(() => {
            this.EndGame(gameId);
        }, 10*60*1000);
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

            dmc.send(`Vote for your selection for the minority (3 minutes) :\n${playersList}`)
            
            await dmc.awaitMessages( { max: 1, filter: msgfilternum, time: 60 * 3 * 1000 })
                .catch(error => undefined)
                .then((msg) =>{
                    const votedPlayer = typeof msg !== 'undefined' ?
                                             this.allPlayers[parseInt(msg.at(0)!.content) - 1] :
                                             this.allPlayers[Math.floor(Math.random() * this.allPlayers.length)];
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

        let votedMsg = "";

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
                await dmc.send(votedMsg + ", (5 minutes)");

                if(majorityWin){
                    majorityWin = await dmc.awaitMessages({ max: 1, filter: msgFilterYN, time: 60 * 5 * 1000 })
                                           .catch(error => undefined)
                                           .then( msg => typeof msg === 'undefined' || msg.at(0)!.content !== 'Y' );
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

            if(majorityWin){

                let minorityWinVotes = 0;

                const winVotes = this.players.map(async (player) => {
                    const dmc = await player.createDM();
    
                    dmc.send(votedMsg + ", (2 minutes)");
    
                    if(majorityWin && 
                       await dmc.awaitMessages({ max: 1, filter: msgFilterYN, time: 60 * 2 * 1000 })
                                .catch(error => undefined)
                                .then( msg => typeof msg === 'undefined' || msg.at(0)!.content === 'Y' )){
                        ++minorityWinVotes
                    }
    
                    return;
                });

                await Promise.all(winVotes);

                majorityWin = minorityWinVotes >= Math.floor(this.players.length / 2);
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
        }

    }

}