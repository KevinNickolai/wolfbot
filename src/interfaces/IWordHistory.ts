import * as Discord from "discord.js";
import { Roles } from "../classes/Game";
import { WordPair } from "../classes/WordSelector";

export interface IWordsHistory{
    userId: string
    words: IWordHistory[]; 
}

export interface IWordHistory extends WordPair {
    gameId?: number;
    allowForBotUse: boolean;
    createdAt: Date;
}