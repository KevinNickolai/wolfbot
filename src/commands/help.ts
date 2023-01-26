import { ICommand } from "../interfaces/ICommand";
import * as Discord from "discord.js";
import CommandClient from "../classes/CommandClient";
import { prefix } from "../config";
export default {
    name: 'help',
    aliases: ['commands', 'cmd', 'cmds', '?'],
    description: "Help command",
    args: false,
    execute(message: Discord.Message, args: string[]){
    
        let data : string[] = [];
    
        const commands = (message.client as CommandClient).commands;
    
        if(!args.length){
            data.push("List of commands: ");
            let cmds = [];
    
            for(var [key, val] of commands){
                cmds.push(val.name);
            }
    
            data.push(cmds.join(", "));
    
            data.push(`\nUse \'${prefix}help <command name>\' for help on specific commands.`);
    
            return message.reply({ content: data.join('\n') });
        }
        else{
            const name: string = args[0].toLowerCase();
    
            const command : ICommand = commands.get(name) || Array.from<ICommand>(commands.values()).find((cmd: ICommand) => cmd.aliases?.includes(name));

            if(!command) {
                return message.reply(`'${name}' is not a valid command.`);
            }
    
            data.push(`**Name:** ${command.name}`);
    
            if(command.aliases) data.push(`*Aliases:* ${command.aliases.join(', ')}`);
            if(command.description) data.push(`*Description:* ${command.description}`);
            if(command.usage) data.push(`*Usage:* ${prefix}${command.name} ${command.usage}`);
            if(command.flags) data.push(`*Flags:* ${command.flags}`)
        
            return message.reply({ content: data.join('\n')});
        }
    }
} as ICommand
