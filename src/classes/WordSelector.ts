import { generateSlug, totalUniqueSlugs } from "random-word-slugs";

/**
 * Adjective Categorization or Sub-category
 */
export enum Adjectives {
    Appearance = "appearance",
    Color = "color",
    Condition = "condition",
    Personality = "personality",
    Quantity = "quantity",
    Shape = "shapes",
    Size = "size",
    Sound = "sounds",
    Taste = "taste",
    Time = "time",
    Touch = "touch"
}

/**
 * Noun Categorization or Sub-category
 */
export enum Nouns {
    Animal = "animals",
    Business = "business",
    Education = "education",
    Family = "family",
    Food = "food",
    Health = "health", // Health only has totalUniqueSlugs(1) === 1, so not exactly useful here
    Media = "media",
    People = "people",
    Place = "place",
    Profession = "profession",
    Religion = "religion",
    Science = "science",
    Sport = "sports",
    Technology = "technology",
    Thing = "thing",
    Time = "time",
    Transportation = "transportation"
}

/**
 * Part of Speech word categories
 */
export enum Categories {
    Noun = "noun",
    Adjective = "adjective"
}

/**
 * Structure that defines a word pair of minority/majority
 */
export interface WordPair {
    minorityWord: string;
    majorityWord: string;
}

/**
 * Abstraction on static class WordSelector
 * Validates message input for word pairings and generates random word pairings 
 */
export abstract class WordSelector {

    /**
     * Validate word selection input message
     * @param input message to parse for two valid word values
     * @returns {boolean} true if valid word input message string, false otherwise.
     */
    static Validate(input: string) : boolean {
        let valid = input.includes('|');

        if(valid){
            let splitWords = input.split('|');

            valid = splitWords.length === 2 &&
                    splitWords[0].trim().length > 0 && splitWords[0].trim().length <= 64 &&
                    splitWords[1].trim().length > 0 && splitWords[1].trim().length <= 64 &&
                    splitWords[0].trim().toLowerCase() !== splitWords[1].trim().toLowerCase();
        }

        return valid;
    }

    /**
     * Extract two words from a string input if the string message is in a valid format.
     * @param input message to parse for two valid word values
     * @returns {WordPair | undefined} WordPair if valid word pairing, undefined otherwise.
     */
    static ExtractWords(input: string) : WordPair | undefined {

        if(this.Validate(input)){

            const splitWords = input.split('|');

            return {
                        majorityWord: splitWords[0].trim().toLowerCase(), 
                        minorityWord: splitWords[1].trim().toLowerCase()
                   };

        }

        return undefined;
    }

    /**
     * Generate a random word pair
     * @param matchSpeechPart flag indicating if the Part of Speech (noun, adjective) should be matched between the two words
     * @param matchCategory flag indicating if the Sub-category of the Part of Speech should be matched between the two words
     * @returns {WordPair} randomly generated from the specific flags
     */
    static RandomWords(matchSpeechPart: boolean = true, matchCategory: boolean = matchSpeechPart) : WordPair {

        let speechPart = Math.floor(Math.random() * 2) ? Categories.Noun : Categories.Adjective;

        if(matchSpeechPart){
                
            /*
            * Get the count of the elements in the enums depending on speech part.
            * In the case of string only element enums, Object.keys().length will return the count.
            * See 
            * https://stackoverflow.com/questions/38034673/determine-the-number-of-enum-elements-typescript
            * for explanation
            */
            const categoryPerSpeechPart = speechPart === Categories.Noun ? Nouns : Adjectives;
            const categoryElementCount = Object.keys(categoryPerSpeechPart).length;

            let randomCategory;

            /* 
            * Generate random category while the totalUniqueSlugs that the PoS and category 
            * together can generate is only 1, to prevent an infinite loop when selecting the second word
            */
            do{
                randomCategory = Object.values(categoryPerSpeechPart).at(Math.floor(Math.random() * categoryElementCount))!;
            } while(totalUniqueSlugs(1, { partsOfSpeech: [ speechPart ], categories: { [speechPart]: [ randomCategory ] }}) === 1)

            const firstWord = generateSlug(1, { partsOfSpeech: [ speechPart ], categories: { [speechPart]: [ randomCategory ] }});

            if(matchCategory){

                let secondWord; 

                do {
                    secondWord = generateSlug(1, { partsOfSpeech: [ speechPart ], categories: { [speechPart]: [ randomCategory ] }});
                } while(secondWord === firstWord);

                return { majorityWord: firstWord, minorityWord: secondWord };
            }

            do{
                randomCategory = Object.values(categoryPerSpeechPart).at(Math.floor(Math.random() * categoryElementCount))!;
            } while(totalUniqueSlugs(1, { partsOfSpeech: [ speechPart ], categories: { [speechPart]: [ randomCategory ] }}) === 1)

            let secondWord;
            
            do {
                secondWord = generateSlug(1, { partsOfSpeech: [ speechPart ], categories: { [speechPart]: [ randomCategory ] }});
            } while(secondWord === firstWord);

            return { majorityWord: firstWord, minorityWord: secondWord };

        }
        else{
            const firstWord = generateSlug(1);
        
            let secondWord; 
    
            do {
                secondWord = generateSlug(1);
            } while(secondWord === firstWord);
    
    
            return { majorityWord: firstWord, minorityWord: secondWord };
        }
    }


}