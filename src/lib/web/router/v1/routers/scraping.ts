import { FastifyReply, FastifyRequest, HookHandlerDoneFunction} from "fastify";
import { ScrapingControllerClass } from "../controller/scraping";
import { required } from "yargs";

export class ScrapingRouterClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    scrapingControllerInstance: ScrapingControllerClass | null;
    
    constructor(parent: any) {
        this.parent = parent;
        this.router = null;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.scrapingControllerInstance = null;
        
        this.init();
    }
    initDependencies(){
        this.scrapingControllerInstance = new ScrapingControllerClass(this.parent);
    }
    
    init(){
        const _this = this;
        
        this.initDependencies();
        
        this.router = (fastify: any, options: any, done: any) => {
            delete options.prefix;
            
            _this.setupHooks(fastify, options);
            
            _this.setupRoutes(fastify,options);
            
            _this.setupRouters(fastify, options);
            
            // Done registration
            done();
        };
    }
    
    setupRoutes(fastify: any, options: any) {
        
        fastify?.get("/scan", {
            schema: {
                description: 'Run scan for query',
                tags: ['Scraper'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            
                        }
                    }
                },
                querystring: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                        query: { type: 'string', description: 'POI to search' },
                        regioni: { type: 'array', description: 'Regions to search' },
                        province: { type: 'array', description: 'Province to search' },
                        comuni: { type: 'array', description: 'Comuni to search' },
                        level: { type: 'string', description: 'Level to search' },
                        state: { type: 'string', description: 'State to search' },
                    }
                },
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => await this.scrapingControllerInstance?.mapScraperScanHandler(req, reply));
        
        fastify?.get("/extraction", {
            schema: {
                description: 'Get specific scan extraction',
                tags: ['Scraper'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            
                        }
                    }
                },
                querystring: {
                    type: 'object',
                    required: ['filename'],
                    properties: {
                        filename: { type: 'string', description: 'The name of the file to retrieve' },
                        clean: { type: 'boolean', description: 'Get clean data' },
                        fields: { type: 'array', description: 'Get specific fields' },
                    }
                },
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => await this.scrapingControllerInstance?.getExtractionHandler(req, reply));
        
    }
    
    
    setupRouters(fastify: any, options: any) {}
    
    
    setupHooks(fastify: any, options: any) {
        // Logger
        if (options.log){
            fastify.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, payload: any, done: HookHandlerDoneFunction) => {
                if (request.headers['log-off']) return done(); // log-off is a custom header used to tell the logger to not log a request
                options.log.log(request, reply, payload);
                return done();
            });
        }
    }
    
    
    
    registerRouter() {
        return this.router;
    }
}