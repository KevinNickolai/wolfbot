export interface ICommand{
    name: string;
    aliases?: string[];
    description: string;
    args?: boolean;
    guildOnly?: boolean;
    dmOnly?: boolean;
    execute: Function;
    flags?: string[];
    usage?: string;
}