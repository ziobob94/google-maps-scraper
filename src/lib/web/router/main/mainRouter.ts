import { FastifyReply, FastifyRequest, HookHandlerDoneFunction} from "fastify";
import { MainControllerClass } from "./mainController";

export class MainRouterClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    mainController: any;
    
    constructor(parent: any) {
        this.parent = parent;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.router = null;
        
        this.init();
    }
    initDependencies(){
        this.setupControllers();
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
        
        fastify?.get("/registered-routes", {
            schema: {
                description: 'Get user info and permissions',
                tags: ['Auth'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                additionalProperties: true
                            },
                            routes: {
                                type: 'array',
                                additionalProperties: {
                                    type: 'array',
                                    items: { type: 'object' },
                                },
                            }
                        }
                    }
                },
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => await this.mainController?.getRegisteredRoutesHandler(req, reply));
        
    }
    
    
    setupRouters(fastify: any, options: any) {}
    
    
    setupHooks(fastify: any, options: any) {
/*         // Logger
        if (options.log){
            fastify.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, payload: any, done: HookHandlerDoneFunction) => {
                if (request.headers['log-off']) return done(); // log-off is a custom header used to tell the logger to not log a request
                options.log.log(request, reply, payload);
                return done();
            });
        } */
    }
    
    setupControllers(){
        this.mainController = new MainControllerClass(this);
    }
    
    
    registerRouter() {
        return this.router;
    }
}