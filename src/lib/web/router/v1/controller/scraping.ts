import { MongoWrapperClass } from '../../../../../database/mongodb/MongoWrapperClass';
import { MapScraperClass } from './../../../../scraper/MapScraperClass';
import { FastifyReply, FastifyRequest } from "fastify";


export class ScrapingControllerClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    mapScraperInstance: MapScraperClass | null;
    entitiesInstance: MongoWrapperClass;
    
    constructor(parent: any) {
        this.parent = parent;
        this.entitiesInstance = parent.entitiesInstance;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.router = null;
        this.mapScraperInstance = null;
        
        this.init();
    }
    initDependencies(){
        this.mapScraperInstance = new MapScraperClass(this);
    }
    
    init() {
        this.initDependencies(); 
    }

    async mapScraperScanHandler(req: FastifyRequest, res: FastifyReply) {
        let params : any = { ...req.query as object};

        params.regioni = params?.regioni.length > 0 ? params?.regioni[0]?.split(',') : [];
        params.province =  params?.province.length > 0 ? params?.province[0]?.split(',') : [];
        params.comuni = params?.comuni?.length > 0 ? params?.comuni[0]?.split(',') : [];
        

        try {
            const result = await this.mapScraperInstance?.runMaps(params);
            res.send(JSON.stringify(result));
        } catch (error: Error | any) {
            console.log(error);
            res.statusCode = 500
            res.send(error.message);
        }
    }

    async getExtractionHandler(req: FastifyRequest, res: FastifyReply) {
        const queryParams = req.query as any;
        // const clean = Object.keys(queryParams).includes("clean")
        //     ? queryParams?.clean
        //     : false
        // const result = await this.mapScraperInstance?.getExportByMaps(
        //     queryParams?.filename || "",
        //     clean,
        //     queryParams?.fields[0].split(",") || [],
        //     queryParams.flatten || false
        // )

        const fields: string = queryParams.fields.length ? queryParams.fields[0].split(",") : null;
        const builtFields: any = {};
        if (fields) {
            for (const field of fields) {
                builtFields[field] = 1;
            }
        }
        try {

            const estateAgencyQuery = this.entitiesInstance?.estateAgencyModel?.find({});

            let result = null

            if (estateAgencyQuery) {
                const query = fields ? estateAgencyQuery.select(builtFields) : estateAgencyQuery;
                result = await query.lean();
            }
            res.send({ status: true, result });
        } catch (error: any) {
            console.log(error);
            res.statusCode = 500
            res.send(error.message);
        }

    }

}
