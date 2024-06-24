import * as fs from 'fs';
//import * as path from 'path';

export async function writeResultOnJsonFile(result: any, name: string = 'data') {

    // Get the current date as a string (e.g., "2023-09-03")
    const currentDate = new Date().toISOString().split('T')[0];

    // Define the filename with the current date
    const fileName = `${name}_${currentDate}.json`;


    fs.mkdirSync('./data', { recursive: true }); // Create the folder if it doesn't exist (with recursive option)

    fs.writeFileSync('./data/' + fileName, JSON.stringify(result, null, 2)); // Write the JSON data to the file

    return true;
}



export async function getExtraction(filename: string){
    return JSON.parse(fs.readFileSync('./data/' + filename + '.json', 'utf-8'))
}