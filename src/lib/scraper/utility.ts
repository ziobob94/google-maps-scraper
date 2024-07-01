import * as fs from 'fs';
//import * as path from 'path';
import { format } from 'date-fns';

export async function writeResultOnJsonFile(result: any, name: string = 'data') {

    try {
        // Get the current date as a string (e.g., "2023-09-03")
        const currentDate = format(new Date(), "yyyy-MMdd")

        // Define the filename with the current date
        const fileName = `${name}.json`;


        fs.mkdirSync(`./data/${currentDate}`, { recursive: true }); // Create the folder if it doesn't exist (with recursive option)

        fs.writeFileSync(`./data/${currentDate}` + fileName, JSON.stringify(result, null, 2)); // Write the JSON data to the file

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }

}



export async function getExtraction(filename: string, date = '' ){
    try {
        date = date || format(new Date(), "yyyy-MMdd");
        return JSON.parse(fs.readFileSync('./data/' + filename + '.json', 'utf-8'))
        
    } catch (error) {
        console.log(error);
        return null
    }
}