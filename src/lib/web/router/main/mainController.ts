import { FastifyReply, FastifyRequest} from "fastify";

export class MainControllerClass {
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
        
        this.initDependencies(); 
    }
    
    async getRegisteredRoutesHandler(req: FastifyRequest, res: FastifyReply) {
        const result : any = [];
        
        const routes = await this.serverApp.getRegisteredRoutes();
        
        routes.forEach((route: any) => {
            result.push({method: route.method, path: route.path})
        })
        
        //routes: result

        const body = {
            result: "OK",
            routes: result
        }
        
        res.status(200).send(body);
    }
}