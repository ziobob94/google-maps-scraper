import { FastifyInstance} from 'fastify';
import { LoggerClass } from '../../LoggerClass';
import { IConfig } from 'config';
import RouterClassV1 from '../router/v1';
import { MainRouterClass } from '../router/main/mainRouter';
import { WebClass } from '../WebClass';

/**
 * Represents a web server class using Fastify.
 */
export interface WebClassInterface {
    /**
     * Parent object reference.
     */
    parent: any;

    /**
     * Configuration object, typically from `config` or provided externally.
     */
    config?: IConfig;

    /**
     * Logger instance for logging server events and messages.
     */
    logger?: LoggerClass;

    /**
     * Fastify server instance.
     */
    server?: FastifyInstance;

    /**
     * Port number on which the server will listen.
     */
    port?: number;

    /**
     * Registered routes.
     */
    registeredRoutes: Set<any>;

    /**
     * Router instance for the V1 API.
     */
    routerInstanceV1?: RouterClassV1;

    /**
     * Main router instance.
     */
    mainRouterInstance?: MainRouterClass;

    /**
     * Web class instance.
     */
    serverApp: WebClassInterface



    /**
     * Initializes the server instance and sets up necessary configurations.
     */
    initServer(): void;

    /**
     * Asynchronously starts the server listening on the specified port.
     * @throws {Error} If the server or port is not initialized.
     */
    runServer(): Promise<void>;

    /**
     * Creates a Fastify server instance with or without SSL configuration.
     * @throws {Error} If SSL configuration is enabled but keyPath or certPath is missing.
     */
    createFastifyServer(): void;

    /**
     * Sets up the server by initializing dependencies, creating Fastify server, adding addons, plugins, routes, and hooks.
     */
    setupServer(): Promise<void>;

    /**
     * Starts the server with a specific port or the default port from environment variables.
     * @param specificPort - The specific port to use. Defaults to -1.
     * @throws {Error} If SERVER_PORT and specificPort are not provided.
     */
    startServer(specificPort?: number): Promise<void>;

    /**
     * Retrieves the Fastify server instance.
     */
    getServer(): FastifyInstance | null;

    /**
     * Sets up the routes for the V1 API.
     * @throws {Error} If router instance is not initialized.
     */
    // setupRoutes(): Promise<void>;


    /**
     * Sets up the routers for the V1 API.
     * @throws {Error} If router instance is not initialized.
     */
    setupRouters(): Promise<void>;

    /**
     * Adds a hook to the server.
     * @param hook - The hook to be added.
     * @param cb - The callback function to be executed when the hook is triggered.
     * @param reason - The reason for adding the hook (optional).
     */
    addHookToServer(hook: any, cb: any, reason?: string): void;

    /**
     * Sets up hooks for the server.
     */
    setupHooks(): Promise<void>;

    /**
     * Initializes CORS configuration for the server.
     */
    initCors(): void;

    /**
     * Initializes ACL (Access Control List) configuration for the server.
     */
    initACL(): void;

    /**
     * Sets up dependencies needed for the server operation.
     */
    setupDependecies(): Promise<void>;

    /**
     * Sets up additional plugins like CORS and ACL.
     */
    setupPlugins(): Promise<void>;

    /**
     * Registers Swagger UI for API documentation if configured.
     */
    registerSwagger(): Promise<void>;

    /**
     * Sets up addons for the server, currently registers Swagger.
     */
    setupAddons(): Promise<void>;

    /**
     * Sets up error handlers for the server, including handling 404 errors.
     */
    setupErrorHandlers(): Promise<void>;
}
