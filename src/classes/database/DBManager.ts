import { Roles } from "../Game";
import { Sequelize, Model, DataTypes, Op, QueryTypes } from "sequelize";
import { localDBConfig } from "../../config";
import { WordPair } from "../WordSelector";
import { IStats } from "../../interfaces/IStats";
import { IGameHistory, IHistory } from "../../interfaces/IHistory";
import { IWordsHistory, IWordHistory } from "../../interfaces/IWordHistory";
import { PermissionOverwriteManager } from "discord.js";

export const HISTORY_GAME_COUNT = 4;

const sequelize = new Sequelize(localDBConfig.database!, localDBConfig.user!, localDBConfig.password!, {
    host: localDBConfig.host,
    dialect: "mysql"
});


const defaultUserStats : IUserStats = {
    minorityWins : 0,
    minorityGamesPlayed: 0,
    majorityWins: 0,
    majorityGamesPlayed: 0,
    wordPairsSubmitted: 0,
    gamesGM: 0
}

interface IUserStats {
    minorityWins : number;
    minorityGamesPlayed: number;
    majorityWins: number;
    majorityGamesPlayed: number;
    wordPairsSubmitted: number;
    gamesGM: number;
}

class Game extends Model {
    declare gameId: number;
    declare guildId: string;
    declare gameMasterId: string;
    declare createdAt: Date;
    declare GameUsers: GameUser[];
    declare playerCount: number;
    declare WordPairing: WordPairing;
    declare spoofed: number;
}

class User extends Model {
    declare userId: string; 
    declare GameUsers: GameUser[];
    declare Games: Game[];
}

class Guild extends Model {
    declare guildId: string;
}

class GameUser extends Model{
        declare userId: string;
        declare gameId: number;
        declare role: Roles;
        declare win: boolean;
        declare Game: Game;
        declare User: User;
}

class WordPairing extends Model{
    declare pairId: number;
    declare userId: string;
    declare majorityWord: string;
    declare minorityWord: string;
    declare gameId: number;
    declare allowForBotUse: boolean;
    declare createdAt: Date;
}

Guild.init({
    guildId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true
    }
},
    {
        sequelize
    }
);

User.init({
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true
    }
},
    {
        sequelize
    }
);

Game.init({
    gameId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    guildId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references:{
            model: Guild,
            key: 'guildId'
        }
    },
    gameMasterId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references: {
            model: User,
            key: 'userId'
        }
    },
    spoofed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
},  
    { 
        sequelize
    }
);

GameUser.init({
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true,
        references: {
            model: User,
            key: 'userId'
        }
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
            model: Game,
            key: 'gameId'
        }
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    },
    win: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null
    }
},
    {
        sequelize
    }
);

WordPairing.init({
    pairId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references: {
            model: User,
            key: 'userId'
        },
        // Discord Snowflake IDs are variable in length, so regex for 18 digit strings is invalid.
        // validate: {
        //     is: /^\d{18}$/
        // },
        unique: 'user_words_uidx'
    },
    majorityWord: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: 'user_words_uidx'
    },
    minorityWord: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: 'user_words_uidx'
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Game,
            key: 'gameId'
        },
        defaultValue: null,
        unique: 'user_words_uidx'
    },
    allowForBotUse: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
},
    { 
        sequelize
        //indexes: [ { unique: true, fields: ['userId', 'majorityWord', 'minorityWord', 'gameId'] } ]
    }
);

User.hasMany(WordPairing, { sourceKey: 'userId', foreignKey: 'userId'});

Guild.hasMany(Game, { sourceKey: 'guildId', foreignKey: 'guildId'});

Game.hasOne(WordPairing, { sourceKey: 'gameId', foreignKey: 'gameId' });

Game.hasMany(GameUser, { foreignKey: { name: 'gameId' } });
GameUser.belongsTo(Game, { foreignKey: { name: 'gameId', allowNull: false } });

User.hasMany(GameUser, { foreignKey: { name: 'userId'} });
GameUser.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false } });


User.belongsToMany(Game, { through: GameUser, foreignKey: 'userId' });
Game.belongsToMany(User, { through: GameUser, foreignKey: 'gameId' });


export class DBManager {
    constructor(){
        try{
            sequelize.authenticate();
        }
        catch (error){
            console.log(error);
        }
    }

    async init() : Promise<boolean>{
        return new Promise(async (resolve, reject) => {
            await sequelize.sync();
            resolve(true);
        });
    }

    /**
     * Generate a game
     * @param guildId of the guild the game is played on
     * @param gameMasterId userId of the GM of the game
     * @param spoofed flag indicating if the game is created from the spoof command
     * @returns {Promise<number>} Promise of the gameId that has been created
     */
    async GenerateGame(guildId: string, gameMasterId: string, spoofed: boolean = false) : Promise<number> {

        await Promise.all([
            Guild.findOrCreate({
                where: { guildId: guildId }
            }), 
            User.findOrCreate({
                where: { userId: gameMasterId }
            })
        ]);

        return await Game.create({
            guildId: guildId,
            gameMasterId: gameMasterId,
            spoofed: spoofed
        }).then(g => g.gameId);

    }

    /**
     * Set the GameUsers for a specific game
     * @param gameId to set GameUsers for
     * @param gameUsers Map of string, Roles: userId mapped to user's game role
     */
    async SetGameUsers(gameId: number, gameUsers: Map<string, Roles>) {
        
        let creation = [];

        for(const [userId, role] of gameUsers){
            creation.push(User.findOrCreate({ where: { userId: userId }})
                                .then(u => GameUser.create( {
                                        userId: u[0].userId, 
                                        gameId: gameId,
                                        role: role 
                                    } )));
        }

        await Promise.all(creation);

    }

    /**
     * Submit a word pair for later use
     * @param userId to create the word pair for
     * @param words to use in the word pair
     * @param allowForBotUse flag indicating if the bot can use the word pair in bot GM games
     * @returns {Promise<boolean>} true if the submission was valid, false otherwise.
     */
    async SubmitWordPair(userId: string, words : WordPair, allowForBotUse: boolean = false) : Promise<boolean>{

        const user = await User.findOrCreate({where: { userId: userId }});

        const foundUnusedMatchingWordPair = await WordPairing.findOne({ where: { userId: user[0].userId, majorityWord: words.majorityWord, minorityWord: words.minorityWord, gameId: null}});

        if(foundUnusedMatchingWordPair) return false;

        const insertion = await WordPairing.create( { 
                                                        userId: user[0].userId, 
                                                        majorityWord: words.majorityWord,
                                                        minorityWord: words.minorityWord,
                                                        allowForBotUse: allowForBotUse
                                                    } )
                                    .catch((error) => {
                                        return undefined;
                                    });
        return !!insertion;
    }

    /**
     * Spontaneously create a word pair for immediate game use
     * @param userId to create the word pair for
     * @param words to use in the word pair
     * @param gameId to associate the word pair to
     */
    async CreateSpontaneousWordPair(userId: string, words: WordPair, gameId: number) {
        const user = await User.findOrCreate({where: {userId: userId}});

        await WordPairing.create({ 
            userId: user[0].userId,
            majorityWord: words.majorityWord,
            minorityWord: words.minorityWord,
            gameId: gameId,
            allowForBotUse: false
        });
    }

    /**
     * Get a single word pair submitted by a user, with a priority on pairs available to the bot first.
     * @param userId to get the word pair for
     * @param gameId to set the WordPairing.gameId if a word pair is found
     * @returns {Promise<WordPair | undefined>} Promise for: one player's valid word pair if found, undefined otherwise.
     */
    async GetUserWordPair(userId: string, gameId: number) : Promise<WordPair | undefined> {

        const pairing = await WordPairing.findOne( {
            where: {
                userId: userId,
                gameId: null
            },
            order: [
                [ 'allowForBotUse', 'DESC' ],
                sequelize.random()
            ]
        });

        if(pairing){
            await pairing.update({ gameId: gameId });
            return { majorityWord: pairing.majorityWord, minorityWord: pairing.minorityWord };
        }

        return undefined;
    }

    /**
     * Query for a word pair available for bot use that is not submitted by the userIds that should be ignored
     * @param ignoreUserIds userIds to ignore for word pair selection 
     * @param gameId to set the WordPairing.gameId if a word pair is found 
     * @returns {Promise<WordPair | undefined>} Promise for: one valid word pair if found, undefined otherwise.
     */
    async QueryForWordPair(ignoreUserIds : string[], gameId: number) : Promise<WordPair | undefined> {
        const pairing = await WordPairing.findOne( { 
            where: {
                userId: {
                    [Op.notIn]: ignoreUserIds
                },
                gameId: null,
                allowForBotUse: true
            },
            order: sequelize.random()
        } );

        if(pairing){
            await pairing.update({ gameId: gameId });
            return { majorityWord: pairing.majorityWord, minorityWord: pairing.minorityWord };
        }

        return undefined;
    }

    /**
     * Set the game winner(s) based on their userIds, and assume/set the rest of the users in the game as lost
     * @param gameId to set winners and losers for
     * @param gameUserIds The userIds of the winners
     */
    async SetWinners(gameId: number, gameUserIds: string[]){

        // set winners
        const wins = GameUser.update({ win: true }, { where: { gameId: gameId, userId: { [Op.in]: gameUserIds }}});

        // set losers
        const loss = GameUser.update({ win: false }, { where: { gameId: gameId, userId: { [Op.notIn]: gameUserIds }}});

        await Promise.all([wins, loss]);
    }

    /**
     * Get a user's all time stats
     * @param userId to get stats for
     * @param includeSpoofed flag indicating if spoofed games should be counted
     * @returns {Promise<IStats>} Promise of IStats of the userId's all time stats
     */
    async GetStats(userId: string, includeSpoofed: boolean = false) : Promise<IStats> {

        let includeSpoofedResults = [0];

        if(includeSpoofed) includeSpoofedResults.push(1);

        const qry = await sequelize.query(`
        WITH userStatLine_cte AS (
            SELECT userId, role, win
            FROM GameUsers
            INNER JOIN Games ON Games.gameId=GameUsers.gameId
            WHERE spoofed IN (:includeSpoofed)
        ),
        majorityStatLine_cte AS (
            SELECT userId, COUNT(userId) AS GP, CAST(SUM(win) AS SIGNED) AS wins
            FROM userStatLine_cte
            WHERE role=:roleMajority
            GROUP BY userId
        ),
        minorityStatLine_cte AS (
            SELECT userId, COUNT(userId) AS GP, CAST(SUM(win) AS SIGNED) AS wins
            FROM userStatLine_cte
            WHERE role=:roleMinority
            GROUP BY userId
        ),
        wordSubmissionCount_cte AS (
            SELECT userId, COUNT(pairId) AS wordPairsSubmitted
            FROM WordPairings
            GROUP BY userId
        ),
        gameGMCount_cte AS (
            SELECT gameMasterId, COUNT(gameId) AS gamesGM
            FROM Games
            WHERE spoofed in (:includeSpoofed)
            GROUP BY gameMasterId
        )
        SELECT Users.userId,
                COALESCE(major.wins, 0) AS majorityWins, COALESCE(major.GP, 0) AS majorityGamesPlayed,
                COALESCE(minor.wins, 0) AS minorityWins, COALESCE(minor.GP, 0) as minorityGamesPlayed,
                COALESCE(wsc.wordPairsSubmitted, 0) AS wordPairsSubmitted, COALESCE(ggmc.gamesGM, 0) AS gamesGM
        FROM Users
        LEFT JOIN majorityStatLine_cte AS major ON major.userId=Users.userId
        LEFT JOIN minorityStatLine_cte AS minor ON minor.userId=Users.userId
        LEFT JOIN wordSubmissionCount_cte AS wsc ON wsc.userId=Users.userId
        LEFT JOIN gameGMCount_cte AS ggmc ON ggmc.gameMasterId=Users.userId
        WHERE Users.userId=:userId`, {
            type: QueryTypes.SELECT,
            replacements: { 
                userId: userId,
                roleMajority: Roles.Majority,
                roleMinority: Roles.Minority,
                includeSpoofed: includeSpoofedResults
            }
        });

        const userStats = ((qry).at(0) as IUserStats)??defaultUserStats;

        return {
            majorityGames: {
                wins: userStats.majorityWins,
                gamesPlayed: userStats.majorityGamesPlayed,
                winPercentage: userStats.majorityGamesPlayed > 0 ? userStats.majorityWins / userStats.majorityGamesPlayed : 0
            },
            minorityGames: {
                wins: userStats.minorityWins,
                gamesPlayed: userStats.minorityGamesPlayed,
                winPercentage: userStats.minorityGamesPlayed > 0 ? userStats.minorityWins / userStats.minorityGamesPlayed : 0
            },
            allGames: {
                wins: userStats.majorityWins + userStats.minorityWins,
                gamesPlayed: userStats.majorityGamesPlayed + userStats.minorityGamesPlayed,
                winPercentage: userStats.majorityGamesPlayed + userStats.minorityGamesPlayed > 0 ? 
                                    (userStats.majorityWins + userStats.minorityWins) / (userStats.majorityGamesPlayed + userStats.minorityGamesPlayed) : 0
            },
            wordPairsSubmitted: userStats.wordPairsSubmitted,
            gamesGM: userStats.gamesGM
        };

    }

    /**
     * Get a user's recent game history
     * @param userId to get the game history for
     * @param gameCount of games to limit results to
     * @param includeSpoofed flag indicating if spoofed games should be counted
     * @returns {Promise<IHistory>} Promise of IHistory of the user's {0 to gameCount} most recent games
     */
    async GetHistory(userId: string, gameCount : number = HISTORY_GAME_COUNT, includeSpoofed : boolean = false) : Promise<IHistory> {

        let includeSpoofedResults = [0];

        if(includeSpoofed) includeSpoofedResults.push(1);

        const usr = await User.findByPk(userId, {
            attributes: ['userId'],
            subQuery: false,
            limit: gameCount,
            include:
            [{
                model: Game,
                attributes: [ 'gameId', 'gameMasterId', 'createdAt' ],
                where: {
                    spoofed: {
                        [Op.in]: includeSpoofedResults
                    }
                },
                include: [{
                    model: WordPairing,
                    attributes: ['majorityWord', 'minorityWord']
                }, {
                    model: GameUser,
                    attributes: [ 'userId', 'gameId', 'role', 'win' ],
                    separate: true
                }]
            }],
            order: [ [ Game, 'createdAt', 'DESC' ] ] });

        const gamesOfUser = usr?.Games??[];

        return {
                playerId:userId,
                games: gamesOfUser.map((g) : IGameHistory => { return {
                    gameMasterId: g.gameMasterId,
                    playedOn: g.createdAt,
                    playerCount: g.GameUsers.length,
                    role: g.GameUsers.find(gu => gu.userId === userId)?.role!,
                    win: g.GameUsers.find(gu => gu.userId === userId)?.win!,
                    words: { minorityWord: g.WordPairing.minorityWord, majorityWord: g.WordPairing.majorityWord }
                }
            })
        };


    }

    /**
     * Get a user's most recently submitted word pairs
     * @param userId to get word pairs for
     * @param wordPairLimit to get from the user's word pairs
     * @returns {Promise<IWordsHistory>} Promise of IWordsHistory of the user's {0 to wordPairLimit} most recent word pairs
     */
    async ViewWordPairs(userId: string, wordPairLimit : number = 8) : Promise<IWordsHistory>{
        const pairs = await WordPairing.findAll({
            attributes: ['majorityWord', 'minorityWord', 'gameId', 'allowForBotUse', 'createdAt'],
            where: {
                userId: userId
            },
            limit: wordPairLimit,
            order: [['createdAt', 'DESC']]
        });

        return {
            userId: userId,
            words: pairs.map(p => {
                return {
                    majorityWord: p.majorityWord,
                    minorityWord: p.minorityWord,
                    allowForBotUse: p.allowForBotUse,
                    gameId: p.gameId,
                    createdAt: p.createdAt
                } as IWordHistory
            })
        } as IWordsHistory;


    }
}