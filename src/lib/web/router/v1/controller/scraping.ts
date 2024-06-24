import { MapScraperClass } from './../../../../scraper/MapScraperClass';
import { FastifyReply, FastifyRequest } from "fastify";


export class ScrapingControllerClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    mapScraperInstance: MapScraperClass | null;
    
    constructor(parent: any) {
        this.parent = parent;
        this.router = null;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.mapScraperInstance = null;
        
        this.init();
    }
    initDependencies(){
        this.mapScraperInstance = new MapScraperClass(this.parent);
    }
    
    init(){
        
        this.initDependencies(); 
    }

    async mapScraperScanHandler(req: FastifyRequest, res: FastifyReply) {
        let params : any = { ...req.query as object};

        params.regioni = params?.regioni.length > 0 ? params?.regioni[0]?.split(',') : [];
        params.province =  params?.province.length > 0 ? params?.province[0]?.split(',') : [];
        params.comuni = params?.comuni?.length > 0 ? params?.comuni[0]?.split(',') : [];
        

        const result = await this.mapScraperInstance?.runMaps(params);

        res.send(JSON.stringify(result));
    }

    async getExtractionHandler(req: FastifyRequest, res: FastifyReply) {
        const queryParams = req.query as any;
        const result = await this.mapScraperInstance?.getExportByMaps(queryParams?.filename || '', !!queryParams?.clean );
        res.send(JSON.stringify(result));
    }

}
