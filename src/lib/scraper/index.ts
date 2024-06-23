import { startWeb } from "./webScraping";
import { runMaps } from "./mapsScraping";
import yargs from 'yargs';
import { ScraperArgv } from "./index.d";
import regioniTestMap from "./places/testRegioni.json";


export class ScraperClass {
    private parent: any;
    constructor(parent: any = null) {
        this.parent = parent;
    }
    
    async run() {
        
        const argv: ScraperArgv = this.parseArgs(process.argv) as ScraperArgv;
        
        let { mode, filter, skipFinding, level, onlyMaps, query } = argv;
        
        if(!query) {
            console.error("Query not provided, exiting...");
            process.exit(1);
        }
        
        // PRODUCTION 
        if (mode !== 'test-dev') {
            
            filter = filter || false;
            level = level || 'comune';
            mode = mode || 'mongo';
            skipFinding = skipFinding || false;
            
            if (onlyMaps) await startWeb();
            
            await runMaps({ mode, filter, skipFinding, level, onlyMaps, query });
        }
        else { //USE FOR TESTING
            const regions = regioniTestMap
            mode = 'mongo';
            level = 'comune'
            await runMaps({ regions, mode, level, query });
        }
    }
    
    parseArgs(args: string[]) : ScraperArgv {
        try {
            return yargs(args)
            .option('mode', {
                alias: 'mode',
                description: 'The type of extraction "mongo" for mongodb collection, "standard" for grouped json by coutry,region,provincia,city ',
                type: 'string', // You can specify the type of the argument
            })
            .option('filter', {
                alias: 'filter',
                description: 'Filter only the shop type, default "false"',
                type: 'boolean', // Example of specifying a boolean type
            })
            .option('onlyMaps', {
                alias: 'onlyMaps',
                description: 'Get data only from google maps',
                type: 'boolean', // Example of specifying a boolean type
            })
            .option('skipFinding', {
                alias: 'skipFinding',
                description: 'Skip searching data only updates the mongodb collection',
            })
            .option('level', {
                alias: 'level',
                description: 'The depth of the search results it can be "provincia" for provincia level or "comune" for "city" level',
            })
            .option('query', {
                alias: 'query',
                description: 'The query for the search',
            })
            .argv as ScraperArgv;
            
        } catch (error) {
            console.log(error);
            process.exit(1);
        }
    }
    
}