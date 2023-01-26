import { Roles } from "../Game";
import { Sequelize, Model, DataTypes, Op } from "sequelize";
import { localDBConfig } from "../../config";
import { WordPair } from "../WordSelector";
import { IStats } from "../../interfaces/IStats";
import { IGameHistory, IHistory } from "../../interfaces/IHistory";
import { IWordsHistory, IWordHistory } from "../../interfaces/IWordHistory";


const sequelize = new Sequelize(localDBConfig.database!, localDBConfig.user!, localDBConfig.password!, {
    host: localDBConfig.host,
    dialect: "mysql"
});

class Game extends Model {
    declare gameId: number;
    declare guildId: string;
    declare gameMasterId: string;
    declare createdAt: Date;
    declare GameUsers: GameUser[];
    declare playerCount: number;
    declare WordPairing: WordPairing;
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

// User.hasMany(Game, {
//     foreignKey: 'gameMasterId'
// });
// Game.belongsTo(User);

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

    async GenerateGame(guildId: string, gameMasterId: string) : Promise<number> {
        await Guild.findOrCreate({
            where: { guildId: guildId }
        });

        await User.findOrCreate({
            where: { userId: gameMasterId }
        });

        return await Game.create({
            guildId: guildId,
            gameMasterId: gameMasterId
        }).then(g => g.gameId);

    }

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

    async CreateSpontaneousWordPair(userId: string, words: WordPair, gameId: number) {
        const user = await User.findOrCreate({where: {userId: userId}});

        const insertion = await WordPairing.create({ 
            userId: user[0].userId,
            majorityWord: words.majorityWord,
            minorityWord: words.minorityWord,
            gameId: gameId,
            allowForBotUse: false
        });
    }

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

    async SetWinners(gameId: number, gameUserIds: string[]){

        // set winners
        const wins = Promise.all(gameUserIds.map(id => GameUser.update({ win: true }, { where: { gameId: gameId, userId: { [Op.or]: gameUserIds }}})));

        // set losers
        const loss = GameUser.update({ win: false }, { where: { gameId: gameId, win: null } });

        await Promise.all([wins, loss]);
    }

    async GetStats(userId: string) : Promise<IStats> {

        const minorityWins = await User.count({ where: { userId: userId }, include: {
                model: GameUser,
                where: { win: true, role: Roles.Minority }
            } 
        });

        const minorityGamesPlayed = await User.count({ where: { userId: userId }, include: {
                model: GameUser,
                where: { role: Roles.Minority } 
            }
        });

        const majorityWins = await User.count({ where: { userId: userId }, include: {
                model: GameUser,
                where: { win: true, role: Roles.Majority }
            }  
        });

        const majorityGamesPlayed = await User.count({ where: { userId: userId }, include: {
                model: GameUser,
                where: { role: Roles.Majority }
            } 
        });

        const wordPairsSubmitted = await WordPairing.count( { where: { userId: userId } });

        const gamesGM = await Game.count( { where: { gameMasterId: userId } } );

        return {
            majorityGames: {
                wins: majorityWins,
                gamesPlayed: majorityGamesPlayed,
                winPercentage: majorityGamesPlayed > 0 ? majorityWins / majorityGamesPlayed : 0
            },
            minorityGames: {
                wins: minorityWins,
                gamesPlayed: minorityGamesPlayed,
                winPercentage: minorityGamesPlayed > 0 ? minorityWins / minorityGamesPlayed : 0
            },
            allGames: {
                wins: majorityWins + minorityWins,
                gamesPlayed: majorityGamesPlayed + minorityGamesPlayed,
                winPercentage: majorityGamesPlayed + minorityGamesPlayed > 0 ? (majorityWins + minorityWins) / (majorityGamesPlayed + minorityGamesPlayed) : 0
            },
            wordPairsSubmitted,
            gamesGM
        };

    }

    async GetHistory(userId: string, gameCount : number = 4) : Promise<IHistory> {

        const usr = await User.findByPk(userId, {
            attributes: ['userId'],
            subQuery: false,
            limit: gameCount,
            include:
            [{
                model: Game,
                attributes: [ 'gameId', 'gameMasterId', 'createdAt' ],
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

        const gamesOfUser = usr!.Games;

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