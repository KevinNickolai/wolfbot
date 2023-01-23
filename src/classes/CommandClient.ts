import { Client, ClientOptions, Guild } from "discord.js";
import { DBManager } from "./database/DBManager";
import Game from "./Game";
import Lobby from "./Lobby";

export default class CommandClient extends Client {
    public commands: Map<string, any>;
    public lobbies : Map<Guild, Lobby>;
    public games : Map<Guild, Game>;
    
    public database : DBManager;

    constructor(options: ClientOptions){
        super(options);
        this.commands = new Map<string, any>();
        this.lobbies = new Map<Guild, Lobby>();
        this.games = new Map<Guild, Game>();
        this.database = new DBManager();
    }
}