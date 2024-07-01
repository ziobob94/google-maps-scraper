import fastify, { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import * as fastifyCors from '@fastify/cors';
import fs from 'fs';
//import ACL from 'pixl-acl';
import RouterClassV1 from './router/v1';
import { LoggerClass } from '../LoggerClass';
import config, { IConfig } from 'config';
import { WebClassInterface } from './declarations/WebClassInterface';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifySwaggerOptions } from '@fastify/swagger';
import { MainRouterClass } from './router/main/mainRouter';

// Server class


export class WebClass implements WebClassInterface {
    parent: any;
    config: IConfig | undefined;
    logger: LoggerClass | undefined;
    server: FastifyInstance | undefined;
    port: number | undefined;
    registeredRoutes: Set<any>;
    routerInstanceV1: RouterClassV1 | undefined;
    mainRouterInstance: MainRouterClass | undefined;
    serverApp: WebClassInterface;
    entitiesInstance: any;

    /**
    * Constructor for initializing the parent, logger, config, server, and port.
    *
    * @param {any} parent - The parent object.
    */
    constructor(parent: any) {
        this.logger?.log("[WebClass] Initializing web class");
        
        this.parent = parent;
        this.entitiesInstance = this.parent.entitiesInstance;
        this.logger = undefined;
        this.config = undefined;
        this.server = undefined;
        this.port = undefined;
        this.registeredRoutes = new Set();
        this.serverApp = this;
        
        this.initServer();
    }
    
    
    /**
    * Asynchronously runs the server if it has been initialized and a port has been provided.
    * Throws an error if the server or port is not initialized.
    * Starts the server and logs the server address if successful.
    *
    * @return {Promise<void>} Promise that resolves when the server is successfully started
    * @throws {Error} If the server or port is not initialized
    */
    async runServer() : Promise<void> {
        
        this.logger?.log("[WebClass] Running server");
        
        if(!this.server || !this.port) {
            console.error("Server or port not initialized");
            this.server = undefined;
            return;
        }
        
        const host = (this.config?.get('server.host') || 'localhost') as string;
        
        
        // Start server
        this.server.listen({port: this.port, host: host},(err, address) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            this.logger?.log(`[WebClass] Server listening at ${address}`);
        });
    }
    
    
    
    /**
    * *******************************
    * ******** SETUP SERVER *********
    * *******************************
    */
    
    
    /**
    * Initializes the server by setting it up and handling any errors that occur during the setup process.
    *
    * @return {void} This function does not return anything.
    */
    initServer() : void {
        
        this.logger?.log("[WebClass] Initializing server");
        
        const _this = this;
        
        this.setupServer()
        .then(() => {
            _this.logger?.log("[WebClass] Server initialized successfully");
        });
    }
    
    
    /**
    * Creates a Fastify server instance with or without SSL configuration.
    *
    * @return {void} This function does not return anything.
    * @throws {Error} If the SSL configuration is enabled but the keyPath or certPath is not provided.
    */
    async createFastifyServer() : Promise<void> {
        
        this.logger?.log("[WebClass] Creating Fastify server");
        
        if (this.config?.has("server.security.ssl") && this.config?.get("server.security.ssl.enabled")) {
            
            const sslConfig : any = this.config?.get("server.security.ssl");
            
            this.logger?.log("[WebClass] SSL enabled");
            
            if(!sslConfig.keyPath) throw new Error("keyPath not provided");
            if(!sslConfig.certPath) throw new Error("certPath not provided");
            
            this.server = fastify({
                https: {
                    key: fs.readFileSync(sslConfig.keyPath),
                    cert: fs.readFileSync(sslConfig.certPath)
                }
            });
            
        } else {
            this.server = fastify();
        }
    }
    
    
    
    
    /**
    * Sets up the server by initializing dependencies, creating the Fastify server,
    * setting up addons, plugins, routes, and hooks.
    *
    * @return {Promise<void>} A promise that resolves when the server is set up.
    */
    async setupServer() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up server");
        
        await this.setupDependecies();
        
        await this.createFastifyServer();
        
        await this.setupAddons();
        
        await this.setupPlugins();
        
        await this.setupErrorHandlers();
        
        await this.setupHooks();
        
        await this.setupRouters();
        
        
    }
    
    
    /**
    * Starts the server with a specific port or the default port from the environment variables.
    *
    * @param {number} specificPort - The specific port to use. Defaults to -1.
    * @return {Promise<void>} A promise that resolves when the server is started.
    * @throws {Error} If SERVER_PORT and specificPort are not provided.
    */
    async startServer(specificPort: number = -1) : Promise<void> {
        
        if(!config.has("server.port") && !specificPort) throw new Error("SERVER_PORT and specificPort not provided");
        
        this.port = specificPort >= 0 ? specificPort : config.get("server.port");
        
        await this.runServer();
    }
    
    
    
    /**
    * Retrieves the Fastify server instance.
    *
    * @return {FastifyInstance} The Fastify server instance.
    * @throws {Error} If the server is not initialized.
    */
    getServer() : FastifyInstance | null {
        
        if(!this.server) return null;
        
        return this.server as FastifyInstance;
    }
    
    
    getWebClassInstance() : WebClass {
        return this;
    }
    
    
    
    /**
    * *******************************
    * ********* SETUP ROUTES ********
    * *******************************
    */
    
    async initRouters() : Promise<void> {
        
        this.logger?.log("[WebClass] Initializing routers");
        
        this.mainRouterInstance = new MainRouterClass(this);
        this.routerInstanceV1 = new RouterClassV1(this);
        
    }
    
    
    /**
    * Sets up the routes for the V1 API.
    *
    * This function registers the router for the V1 API by calling the `register` method of the `server` object.
    * It sets the prefix for the routes to "/v1/".
    * After registering the routes, it logs a message indicating that the routes have been registered.
    *
    * @return {Promise<void>} A promise that resolves when the routes have been set up.
    */
    async setupRouters() : Promise<void> {  
        
        this.logger?.log("[WebClass] Setting up routes");
        
        await this.initRouters();
        
        this.server?.register(this.mainRouterInstance?.registerRouter(), { prefix: "/" });
        // Register router for V1 API
        this.server?.register(this.routerInstanceV1?.registerRouter(), { prefix: "/v1/" });
        
        this.logger?.log("[WebClass] Routes registered");
    }
    
    
    /**
    * *******************************
    * ********* SETUP HOOKS *********
    * *******************************
    */
    
    /**
    * Adds a hook to the server.
    *
    * @param {any} hook - The hook to be added.
    * @param {any} cb - The callback function to be executed when the hook is triggered.
    * @param {string} [reason=''] - The reason for adding the hook (optional).
    * @return {void} This function does not return anything.
    */
    addHookToServer(hook : any, cb: any, reason: string = ''): void {
        this.logger?.log(`[WebClass] Added Hook ${hook} ${reason ? 'for ' + reason + ' ' : ''}added to server`);
        this.server?.addHook(hook, cb);
    }
    
    
    loggerRequestHook(request : FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
        const separator = "".padStart(50, "-") + "\n" + "".padStart(20, "-") + " LOGGER " + "".padStart(22, "-") + "\n" + "".padStart(50, "-");
        this.logger?.log(separator);
        this.logger?.log(`[WebClass] Request received: ${request.method} ${request.url}`);
        this.logger?.log(`[WebClass] Request headers: ${JSON.stringify(request.headers, null, 2)}`);
        if(request.body) this.logger?.log(`[WebClass] Request body: ${JSON.stringify(request.body)}`);
        this.logger?.log("[WebClass] \n");
        done();
    }
    
    debugRequestHook(request : FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
        const separatorDbg = "".padStart(50, "-") + "\n" + "".padStart(21, "-") + " DEBUG " + "".padStart(22, "-") + "\n" + "".padStart(50, "-");
        this.logger?.log(separatorDbg);
        this.logger?.log(`[WebClass] Request received: ${request.method} ${request.url}`);
        this.logger?.log(`[WebClass] Request headers: ${JSON.stringify(request.headers, null, 2)}`);
        if(request.body) this.logger?.log(`[WebClass] RequedebugRequestHookst body: ${JSON.stringify(request.body)}`);
        this.logger?.log("[WebClass] \n");
        done();
    }


    registerRoutesHook(route: any) : void {
        this.logger?.log(`[WebClass] Route ${route.method} ${route.url} registered`);
        if(!this.registeredRoutes) this.registeredRoutes = new Set();
        this.registeredRoutes?.add(route);
    }   
    
    /**
    * Sets up the hooks for the server.
    *
    * @return {Promise<void>} A promise that resolves when the hooks are set up.
    */
    async setupHooks() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up hooks");
        
        //DEBUG HOOK
        this.addHookToServer("onRequest", this.debugRequestHook.bind(this), "DEBUG");
        //LOGGER HOOK
        this.addHookToServer("onRequest", this.loggerRequestHook.bind(this), "LOGGER");

        this.addHookToServer("onRoute", this.registerRoutesHook.bind(this), "REGITER ROUTES");
        
        this.logger?.log("[WebClass] Hooks registered");
    }
    
    
    /**
    * *******************************
    * ******** SETUP PLUGINS ********
    * *******************************
    */
    
    
    
    /** INIT CORS */
    /**
    * Initializes CORS configuration for the server.
    *
    * @return {void} This function does not return anything.
    */
    initCors() : void {
        
        this.logger?.log("[WebClass] Initializing CORS");
        
        // CORS
        this.server?.register(fastifyCors.default, {
            origin: '*', // TODO -> change accordingly
            methods: ['GET', 'POST'] // TODO -> change allowed methods accordingly
        });
        
        this.logger?.log("[WebClass] CORS initialized");
        
    }
    
    /** INIT ACL */
    /**
    * Initializes ACL (Access Control List) configuration for the server.
    *
    * This function checks if the ACL configuration is defined in the `config` object. If it is, it checks if ACL is enabled.
    * If ACL is enabled, it splits the `netACL` property of the ACL configuration into an array of IP addresses.
    * It then creates an instance of the `ACL` class with the array of IP addresses.
    * It defines an `aclCallback` function that checks if the IP address of the incoming request is allowed by the ACL.
    * If the IP address is allowed, it calls the `done` function to continue processing the request.
    * If the IP address is not allowed, it sets the response code to 403 and calls the `done` function with an error.
    * Finally, it adds the `aclCallback` function as a hook to the server's `onRequest` event with the name 'ACL'.
    *
    * If the ACL configuration is not defined, it logs a warning message.
    *
    * @return {void} This function does not return anything.
    */
    initACL() : void {
        
        this.logger?.log("[WebClass] Initializing ACL");
        
        // ACL
        if (this.config?.has("security.ACL")) {
            
            
            const aclConfig : any = this.config?.get("security.ACL");
            
            if(!aclConfig.enabled) {
                this.logger?.log("[WebClass] ACL not enabled");
                return;
            }
            
            this.logger?.log("[WebClass] ACL enabled");
            
            const netACL = aclConfig.netACL.split(','); // TODO -> change accordingly
            
            this.logger?.log(`[WebClass] ACL network: ${netACL}`);
            
            const allowedIPs = {check: (ip : string) => netACL.includes(ip)}//new ACL(netACL);
            
            const aclCallback = (request : FastifyRequest, reply: FastifyReply, done : HookHandlerDoneFunction) => {
                this.logger?.log("[WebClass] Received request from ip: " + request.ip);
                if (allowedIPs.check(request.ip)) return done();
                
                this.logger?.log("[WebClass] IP not allowed!");
                reply.code(403);
                done(new Error('Your IP is not in the ACL!'));
            }
            
            this.addHookToServer("onRequest", aclCallback, 'ACL');
            
        } else {
            this.logger?.log('[WebClass] [WARN] No network ACL defined!');
        }
    }
    
    
    
    /**
    * Initializes the plugins for the application.
    *
    * This function sets up the CORS and ACL plugins.
    *
    * @return {Promise<void>} A promise that resolves when the plugins are set up.
    */
    async setupPlugins() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up plugins");
        
        this.initCors();
        this.initACL();
    }
    
    
    
    /**
    * *******************************
    * ***** SETUP DEPENDENCIES ******
    * *******************************
    */
    
    async setupDependecies() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up dependencies");
        
        this.config = this.parent?.config || config;
        
        if(!this.config) {
            this.logger?.log("[WebClass] Missing config file");
            process.exit(1);
        }
        
        this.logger = this.parent?.logger || new LoggerClass(this.config);
        
    }
    
    
    
    /**
    * *******************************
    * ******** SETUP ADDONS *********
    * *******************************
    */
    
    
    async registerSwagger() : Promise<void> {
        
        this.logger?.log("[WebClass] Registering swagger");
        
        if(!this.server) {
            throw new Error("Server not initialized");
        }
        
        if(!this.config?.has('server.addons.swagger') ) {
            this.logger?.log("[WebClass] Swagger not configured");
            return;
        }
        
        const swaggerConfigs : any = this.config?.get('server.addons.swagger');
        
        if(!swaggerConfigs.enabled) {
            this.logger?.log("[WebClass] Swagger not enabled");
            return;
        }
        
        const port =( swaggerConfigs?.port || 8001 ) as number;
        const host = ( swaggerConfigs?.host || 'localhost' ) as string;
        
        const fastifySwaggerOptions : any ={
            swagger: {
                info: {
                    title: 'Fastify API',
                    description: 'API documentation',
                    version: '0.1.0'
                }, 
                host: `${host}:${port}`,
                schemes: ['http'],
                consumes: ['application/json'],
                produces: ['application/json'],
            }
        }
        
        const fastifyUiOptions : any = {
            routePrefix: '/documentation',
            uiConfig: {
                docExpansion: 'full',
                deepLinking: false
            },
            staticCSP: true,
            transformStaticCSP: (header: string) => header,
            transformSpecification: (swaggerObject: any, request: FastifyRequest, reply: FastifyReply) => {
                return swaggerObject;
            },
            transformSpecificationClone: true
        }
        
        // Initialize Swagger UI
        await this.server.register(swagger, fastifySwaggerOptions);
        await this.server.register(swaggerUi, fastifyUiOptions);
        
        this.logger?.log(`[WebClass] Swagger UI initialized on port ${port}`);
    }
    
    
    
    async setupAddons() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up addons");
        
        await this.registerSwagger();
    }
    
    
    
    /**
    * *******************************
    * ***** SETUP ERROR HANDLER *****
    * *******************************
    */
    
    async setupErrorHandlers() : Promise<void> {
        
        this.logger?.log("[WebClass] Setting up error handlers");
                
        this.server?.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
            this.logger?.log(`[WebClass] Route not found: ${request.url}`);
            reply
            .code(404)
            .send({ error: 'Route not found', statusCode: 404 });
        });
        
        
    }


    /**
    * *******************************
    * *********** GETTERS ***********
    * *******************************
    */

    getRegisteredRoutes() : any {
        return this.registeredRoutes || [];
    }
    
    
    
}
