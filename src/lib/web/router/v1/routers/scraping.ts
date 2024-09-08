import { FastifyReply, FastifyRequest, HookHandlerDoneFunction} from "fastify";
import { ScrapingControllerClass } from "../controller/scraping"

export class ScrapingRouterClass {
	router: any;
	logger: any;
	parent: any;
	serverApp: any;
	scrapingControllerInstance: ScrapingControllerClass | null;
	entitiesInstance: any;

	constructor(parent: any) {
		this.parent = parent
		this.router = null
		this.logger = parent.logger
		this.serverApp = parent.serverApp
		this.scrapingControllerInstance = null
		this.entitiesInstance = parent.entitiesInstance

		this.init()
	}
	initDependencies() {
		this.scrapingControllerInstance = new ScrapingControllerClass(this)
	}

	init() {
		const _this = this

		this.initDependencies()

		this.router = (fastify: any, options: any, done: any) => {
			delete options.prefix

			_this.setupHooks(fastify, options)

			_this.setupRoutes(fastify, options)

			_this.setupRouters(fastify, options)

			// Done registration
			done()
		}
	}

	setupRoutes(fastify: any, options: any) {
		fastify?.get(
			"/scan",
			{
				schema: {
					description: "Run scan for query",
					tags: ["Scraper"],
					response: {
						200: {
							description: "Successful response",
							type: "object",
							properties: {
								status: { type: "string" },
							},
						},
					},
					querystring: {
						type: "object",
						required: ["query"],
						properties: {
							query: { type: "string", description: "POI to search" },
							regioni: {
								type: "array",
								items: { type: "string" },
								description: "Regions to search",
							},
							province: {
								type: "array",
								items: { type: "string" },
								description: "Province to search",
							},
							comuni: {
								type: "array",
								items: { type: "string" },
								description: "Comuni to search",
							},
							level: { type: "string", description: "Level to search" },
							state: { type: "string", description: "State to search" },
						},
					},
				},
			},
			async (req: FastifyRequest, reply: FastifyReply) =>
				await this.scrapingControllerInstance?.mapScraperScanHandler(req, reply)
		)

		fastify.addSchema({
			$id: "field",
			type: "string",
		})

		fastify?.get(
			"/extraction",
			{
				schema: {
					description: "Get specific scan extraction",
					tags: ["Scraper"],
					response: {
						200: {
							description: "Successful response",
							type: "object",
							properties: {
								status: { type: "string" },
								result: { type: "array" },
							},
						},
					},
					querystring: {
						type: "object",
						required: ["filename", "fields"],
						properties: {
							filename: { type: "string" },
							clean: { type: "boolean" },
							fields: {
								type: "array",
								items: { $ref: "field" },
								//minItems: 1, // Ensure there is at least one item in the array
							},
							flatten: { type: "boolean" },
						},
						additionalProperties: false, // Disallow additional properties in the query string
					},
					errorHandler: (errors: any, request: any, reply: any) => {
						// Handle errors here
						reply
							.status(400)
							.send({ error: "Validation Error", message: errors[0].message })
					},
				},
			},
			async (req: FastifyRequest, reply: FastifyReply) =>
				await this.scrapingControllerInstance?.getExtractionHandler(req, reply)
		)

		fastify?.patch(
			'/extraction/:id',
			{
				schema: {
					description: "Update specific scan extraction",
					tags: ["Scraper"],
					response: {
						200: {
							description: "Successful response",
							type: "object",
							properties: {
								status: { type: "boolean" }, // Modificato a booleano
								result: { type: "object", additionalProperties: true }, // Aggiunta proprietà aggiuntiva
							},
							required: ["status", "result"], // Assicurati che tutte le proprietà richieste siano incluse
						},
					},
					body: {
						type: "object",
						properties: {
							data: { type: "object", additionalProperties: true }, // Aggiunta proprietà aggiuntiva
						},
					},
					errorHandler: (errors: any, request: any, reply: any) => {
						// Handle errors here
						reply
							.status(400)
							.send({ error: "Validation Error", message: errors[0].message })
					},
				}
			},
			async (req: FastifyRequest, reply: FastifyReply) => await this.scrapingControllerInstance?.updateSingleDataHandler(req, reply)
		)

		fastify.post('/send-agency-email',
			{
				schema: {
					description: "Update specific scan extraction",
					tags: ["Scraper"],
					response: {
						200: {
							description: "Successful response",
							type: "object",
							properties: {
								status: { type: "boolean" }, // Modificato a booleano
								result: { type: "object", additionalProperties: true }, // Aggiunta proprietà aggiuntiva
							},
							required: ["status", "result"], // Assicurati che tutte le proprietà richieste siano incluse
						},
					},
					body: {
						type: "object",
						properties: {
							id: { type: "string" },
							content: { type: "string" },
							isHtml: { type: "boolean" },
							emailOptions: {
								type: "object",
								properties: {
									to: { type: "string", description: "Email to send" },
									subject: { type: "string", description: "Email subject" },
								},
								additionalProperties: false,
								required: [],
							},
							emailReplacements: {
								type: "object",
							}
						},
						additionalProperties: false, // Non permette proprietà non definite, se è importante mantenere la struttura rigida
						required: [], // Non richiede nessuna proprietà, consentendo un body vuoto
					},
					errorHandler: (errors: any, request: any, reply: any) => {
						// Handle errors here
						reply
							.status(400)
							.send({ error: "Validation Error", message: errors[0].message })
					},
				}
			}, async (req: FastifyRequest, reply: FastifyReply) => await this.scrapingControllerInstance?.sendEmailHandler(req, reply)
		)

		fastify.get('/email-template', {
			schema: {
				description: "Update specific scan extraction",
				tags: ["Scraper"],
				response: {
					200: {
						description: "Successful response",
						type: "object",
						properties: {
							status: { type: "boolean" }, // Modificato a booleano
							result: { type: "string" }, // Aggiunta proprietà aggiuntiva
						},
						required: ["status", "result"], // Assicurati che tutte le proprietà richieste siano incluse
					},
				}
			}
		}, async (req: FastifyRequest, reply: FastifyReply) => await this.scrapingControllerInstance?.getEmailTemplateHandelr(req, reply))
	}

	setupRouters(fastify: any, options: any) { }

	setupHooks(fastify: any, options: any) {
/* 	// Logger
		if (options.log) {
			fastify.addHook(
				"onSend",
				(
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
		} */
	}

	registerRouter() {
		return this.router
	}
}