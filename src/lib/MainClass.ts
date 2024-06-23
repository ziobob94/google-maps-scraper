import { LoggerClass } from "./LoggerClass";
import { ScraperClass } from "./scraper";
import { WebClass } from "./web/WebClass";
import config, { IConfig } from 'config';
import { sleep } from "./web/utilities";

export class MainClass {
    config: IConfig | undefined;
    logger: LoggerClass | undefined;

    // Specific Dependencies
    mapScraper: ScraperClass | undefined;
    webInstance: WebClass | undefined;


    /**
     * Constructor for the MainClass.
     *
     * @param {IConfig | undefined} specificConfig - The specific configuration provided.
     * @param {LoggerClass | undefined} specificLogger - The specific logger provided.
     */
    constructor(specificConfig: IConfig | undefined = undefined, specificLogger: LoggerClass | undefined = undefined) {

        if(!config || !specificConfig) {
            console.error("Missing config file");
            process.exit(1);
        }

        this.config =  specificConfig || config;
        this.logger = specificLogger || undefined;


        if(!this.config.has('server')){
            console.error("Missing server configuration");
            process.exit(1);
        }

    }
    

    /**
     * Initializes dependencies based on configuration settings.
     *
     */
    initDependencies() : void {
        if(!this.logger) this.logger = new LoggerClass(config);
        
        if(this.config?.get("application.scraper.enabled")) this.mapScraper = new ScraperClass(this);
        else this.logger?.log("Scraper not enabled");
        
        if(this.config?.get("server.enabled")) this.webInstance = new WebClass(this);
        else this.logger?.log("Server not enabled");

    }

    /**
     * Asynchronously runs the dependencies of the class.
     *
     * This function runs the server and the map scraper in parallel.
     * If the web instance is defined, it calls the `runServer` method on it.
     * If the map scraper is defined, it calls the `run` method on it.
     *
     * @return {Promise<void>} A promise that resolves when both the server and the map scraper have finished running.
     */
    async runDependencies() : Promise<void> {
        
        const maxServerRetry = this.config?.get("application.maxServerRetry") || 30;
        const maxServerRetryDelay = (this.config?.get("application.maxServerRetryDelay") || 1000) as number;
        
        let score : number = maxServerRetry as number;
        let server : any = undefined;

        while(score > 0 && !server) {
            server = this.webInstance?.getServer();
            if(score !== maxServerRetry) {
                this.logger?.log("[MainClass] Retrying in " + maxServerRetryDelay / 1000 + " seconds...");
                await sleep(maxServerRetryDelay);
                this.logger?.log("[MainClass] Retrying...");
            }
            await this.webInstance?.startServer();
            score--;
        }
        
        if(!server) {
            console.error("Server not initialized");
            process.exit(1);
        }
        
        await this.mapScraper?.run();
    }


    /**
     * Asynchronously runs the dependencies of the class.
     *
     * This function initializes the dependencies based on the configuration settings,
     * and then runs the server and the map scraper in parallel.
     * If the web instance is defined, it calls the `runServer` method on it.
     * If the map scraper is defined, it calls the `run` method on it.
     *
     * @return {Promise<void>} A promise that resolves when both the server and the map scraper have finished running.
     */
    async run() : Promise<void> {
        this.initDependencies();
        await this.runDependencies();
    }
}