import { FastifyReply, FastifyRequest, FastifyInstance , HookHandlerDoneFunction} from "fastify";
import {  getUserInfo,  verifyToken } from "../controller/auth";

export class AuthRouterClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;

    constructor(parent: any) {
        this.parent = parent;
        this.router = null;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;

        this.init();
    }
    initDependencies(){
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
        

        fastify?.get("/getUserInfo", {
            schema: {
                description: 'Get user info and permissions',
                tags: ['Auth'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            info: {
                                type: 'object',
                                additionalProperties: true
                            },
                            permissions: {
                                type: 'object',
                                additionalProperties: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            }
                        }
                    },
                    401: {
                        description: 'invalid response',
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            translationKey: { type: 'string', description: 'The translation key used by the frontend for i18n compatibility' }
                        }
                    }
                },
                security: [
                    {
                        "apiKey": []
                    }
                ]
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => await getUserInfo(req, reply, options.keyv));
        
        /**
        * POST /verifyToken
        * Verify the current user token
        */
        fastify?.post("/verifyToken", {
            schema: {
                description: 'Verify user token',
                tags: ['Auth'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                    }
                },
                security: [
                    {
                        "apiKey": []
                    }
                ]
            }
        }, async (req: FastifyRequest, reply: FastifyReply) => await verifyToken(req, reply, options.keyv));
        
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