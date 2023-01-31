import { Roles } from "../classes/Game";
import { WordPair } from "../classes/WordSelector";

export interface IHistory{
    playerId: string
    games: IGameHistory[]; 
}

export interface IGameHistory{
    role: Roles,
    gameMasterId: string,
    words: WordPair,
    playerCount: number,
    win: boolean,
    playedOn: Date
}