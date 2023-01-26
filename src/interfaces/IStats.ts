export interface IStats{
    allGames: IGameStats,
    minorityGames: IGameStats,
    majorityGames: IGameStats,
    gamesGM: number;
    wordPairsSubmitted: number;
}

interface IGameStats{
    wins: number;
    gamesPlayed: number;
    winPercentage: number;
}