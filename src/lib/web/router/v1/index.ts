import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { AuthRouterClass } from './routers/auth';
import { ScrapingRouterClass } from './routers/scraping';

export default class RouterClassV1 {
	parent: any;
	router: any;
	routerAuth: AuthRouterClass | null;
	routerScraping: any;
	entitiesInstance: any;


	constructor(parent: any = null) {
		this.parent = parent;
		this.entitiesInstance = parent.entitiesInstance;
		this.router = null;
		this.routerAuth = null;

		this.init();
	}

	/**
	 * Initializes the router for the Fastify instance.
	 * @return {void}
	 */
	init(): void {
		const _this = this

		this.initDependencies()

		this.router = (fastify: FastifyInstance, options: any, done: any) => {
			delete options.prefix

			_this.setupHooks(fastify, options)

			_this.setupRoutes(fastify, options)

			_this.setupRouters(fastify, options)

			// Done registration
			done()
		}
	}

	/**
	 * Returns the router for the Fastify instance.
	 *
	 * @return {any} The router for the Fastify instance.
	 */
	registerRouter(): any {
		return this.router
	}

	initDependencies() { }

	setupHooks(fastify: any, options: any) {
		fastify.addHook(
			"preValidation",
			async (
				request: FastifyRequest,
				reply: FastifyReply,
				done: HookHandlerDoneFunction
			) => {
				console.log("preValidation", request.query)
				done()
				// Codice da eseguire
			}
		)

		fastify.addHook(
			"onError",
			async (request: FastifyRequest, reply: FastifyReply, error: any) => {
				// Useful for custom error logging
				// You should not use this hook to update the error
				console.log("onError", error)
				console.log("onError", request.query)
			}
		)

		fastify.addHook(
			"onRequestAbort",
			(request: FastifyRequest, done: HookHandlerDoneFunction) => {
				// Some code
				done()
			}
		)

		fastify.addHook(
			"preHandler",
			async (
				request: FastifyRequest,
				reply: FastifyReply,
				done: HookHandlerDoneFunction
			) => {
				done()
		// Codice da eseguire
			}
		)

		// Logger
		if (options.log) {
			fastify.addHook(
				"onSend",
				async (
					request: FastifyRequest,
					reply: FastifyReply,
					payload: any,
					done: HookHandlerDoneFunction
				) => {
					if (request.headers["log-off"]) return done() // log-off is a custom header used to tell the logger to not log a request
					options.log.log(request, reply, payload)
					return done()
				}
			)
		}
	}

	setupRouters(fastify: any, options: any) {
		// Scraper
		this.routerScraping = new ScrapingRouterClass(this)
		fastify.register(this.routerScraping.registerRouter(), {
			prefix: "/scraper/",
			...options,
		})
	}

	setupRoutes(fastify: any, options: any) { }
}