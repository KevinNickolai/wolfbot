import { BaseApplicationCommandData } from "discord.js";
import mysql from "mysql";
import { Sequelize, Model, DataTypes, Options, Op } from "sequelize";
import { INITIALLY_DEFERRED } from "sequelize/types/deferrable";
import { localDBConfig } from "../../config";
import { WordPair } from "../WordSelector";
const sequelize = new Sequelize(localDBConfig.database!, localDBConfig.user!, localDBConfig.password!, {
    host: localDBConfig.host,
    dialect: "mysql"
});

class Game extends Model {
    declare gameId: number;
    declare guildId: string;
    declare gameMasterId: string;
}

class User extends Model {
    declare userId: string; 
}

class Guild extends Model {
    declare guildId: string;
}

class GameUser extends Model{
        declare userId: string;
        declare gameId: number;
        declare win: boolean;
}

class WordPairing extends Model{
    declare userId: string;
    declare majorityWord: string;
    declare minorityWord: string;
    declare gameId: number;
    declare allowForBotUse: boolean;
}

Guild.init({
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            is: /^\d{18}$/
        }
    }
},
    {
        sequelize
    }
);

User.init({
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            is: /^\d{18}$/
        }
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
        type: DataTypes.STRING,
        allowNull: false,
        references:{
            model: Guild,
            key: 'guildId'
        },
        validate: {
            is: /^\d{18}$/
        }
    },
    gameMasterId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d{18}$/
        }
    }
},  
    { 
        sequelize
    }
);

GameUser.init({
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        references: {
            model: User,
            key: 'userId'
        },
        validate: {
            is: /^\d{18}$/
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
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        references: {
            model: User,
            key: 'userId'
        },
        validate: {
            is: /^\d{18}$/
        }
    },
    majorityWord: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    minorityWord: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    gameId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Game,
            key: 'gameId'
        },
        defaultValue: null
    },
    allowForBotUse: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
},
    { 
        sequelize,
        indexes: [ {unique:true, fields: ['majorityWord', 'minorityWord'] } ]
    }
);

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

    async SubmitWordPair(userId: string, words : WordPair, allowForBotUse: boolean = false) : Promise<boolean>{
        const insertion = await WordPairing.create( { 
                                                        userId: userId, 
                                                        majorityWord: words.majorityWord,
                                                        minorityWord: words.minorityWord,
                                                        allowForBotUse: allowForBotUse
                                                    } )
                                    .catch((error) => {
                                        return undefined;
                                    });
        return !!insertion;
    }

    async GetUserWordPair(userId: string) : Promise<WordPair | undefined> {

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
            return { majorityWord: pairing.majorityWord, minorityWord: pairing.minorityWord };
        }

        return undefined;
    }

    async QueryForWordPair(ignoreUserIds : string[]) : Promise<WordPair | undefined> {
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
            return { majorityWord: pairing.majorityWord, minorityWord: pairing.minorityWord };
        }

        return undefined;
    }
}