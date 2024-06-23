import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { AuthRouterClass } from './routers/auth';
import { ScrapingRouterClass } from './routers/scraping';

export default class RouterClassV1 {
    
    parent: any;
    router: any
    routerAuth: AuthRouterClass | null;
    routerScraping: any;
    
    
    constructor(parent: any = null) {
        this.parent = parent;
        this.router = null;
        this.routerAuth = null;
        
        this.init();
    }
    
    
    /**
    * Initializes the router for the Fastify instance.
    *
    * @param {FastifyInstance} fastify - The Fastify instance.
    * @param {any} options - The options for the router.
    * @param {any} done - The callback function to be called when registration is complete.
    * @return {void}
    */
    init(): void {
        const _this = this;
        
        this.initDependencies();
        
        this.router = (fastify: FastifyInstance, options: any, done: any) => {
            
            delete options.prefix;
            
            _this.setupHooks(fastify, options);
            
            _this.setupRoutes(fastify, options);
            
            _this.setupRouters(fastify, options);
            
            // Done registration
            done();
        };
        
    }
    
    /**
    * Returns the router for the Fastify instance.
    *
    * @return {any} The router for the Fastify instance.
    */
    registerRouter() : any {
        return this.router;
    }
    
    initDependencies() {}
    
    setupHooks(fastify: any, options: any) {
        
        // Logger
        if (options.log)
        fastify.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, payload: any, done: HookHandlerDoneFunction) => {
            if (request.headers['log-off']) return done(); // log-off is a custom header used to tell the logger to not log a request
            options.log.log(request, reply, payload);
            return done();
        });
        
    }
    
    
    setupRouters(fastify: any, options: any) {
 
        // Scraper
        this.routerScraping = new ScrapingRouterClass(this.parent);
        fastify.register(this.routerScraping.registerRouter(), { prefix: "/scraper/", ...options });
        
    }
    
    setupRoutes(fastify: any, options: any){
        
    }
}