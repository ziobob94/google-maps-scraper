import { FastifyReply, FastifyRequest, HookHandlerDoneFunction} from "fastify";
import { TemplateControllerClass } from "../controller/template";

export class TemplateRouterClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    templateControllerInstance: TemplateControllerClass | null;
    
    constructor(parent: any) {
        this.parent = parent;
        this.router = null;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.templateControllerInstance = null;

        this.init();
    }
    initDependencies(){ 
        this.templateControllerInstance = new TemplateControllerClass(this.parent);
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
            return done();
        };
    }
    
    setupRoutes(fastify: any, options: any) {
        
        fastify?.get("/template", {
            schema: {
                description: 'Template route',
                tags: ['Template'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                additionalProperties: true
                            },
                            data: {
                                type: 'object',
                                additionalProperties: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            }
                        }
                    }
                },
                                // body: {
                //     type: 'object',
                //     additionalProperties: false,
                //     required: ['query', 'regions'],
                //     properties: {
                //         query: { type: 'string', description: 'POI to search' },
                //         regions: { type: 'array', description: 'Regions to search' },
                //         level: { type: 'string', description: 'Level to search' },
                //         state: { type: 'string', description: 'State to search' },
                //     }
                
                // }
                querystring: {
                    type: 'object',
                    required: ['query', 'regions'],
                    properties: {
                        query: { type: 'string', description: 'POI to search' },
                        regions: { type: 'array', description: 'Regions to search' },
                        level: { type: 'string', description: 'Level to search' },
                        state: { type: 'string', description: 'State to search' },
                    }
                },
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => this.templateControllerInstance?.templateHandler(req, reply));
        
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