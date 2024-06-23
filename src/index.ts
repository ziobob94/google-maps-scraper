import config from 'config';
import { LoggerClass } from './lib/LoggerClass';
import { MainClass } from './lib/MainClass';

/**
 * Asynchronously runs the main logic of the application.
 *
 * @return {Promise<void>} A promise that resolves when the main logic has completed.
 */
async function main() : Promise<void> {

    const logger : LoggerClass = new LoggerClass(config);
    
    const mainInstance : MainClass = new MainClass(config, logger);

    await mainInstance.run();
}

(async () => await main())();