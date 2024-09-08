import { MongoWrapperClass } from '../../../../../database/mongodb/MongoWrapperClass';
import { MailerClass } from '../../../../utils/mailer';
import { MapScraperClass } from './../../../../scraper/MapScraperClass';
import { FastifyReply, FastifyRequest } from "fastify";
import emailTemplate from "../../../../../../templates/email_template.html";

export class ScrapingControllerClass {
    router: any;
    logger: any;
    parent: any;
    serverApp: any;
    mapScraperInstance: MapScraperClass | null;
    entitiesInstance: MongoWrapperClass;
    mailerInstance: MailerClass | null;
    
    constructor(parent: any) {
        this.parent = parent;
        this.entitiesInstance = parent.entitiesInstance;
        this.logger = parent.logger;
        this.serverApp = parent.serverApp;
        this.router = null;
        this.mapScraperInstance = null;
        this.mailerInstance = null;
        
        this.init();
    }
    initDependencies(){
        this.mapScraperInstance = new MapScraperClass(this);
        this.mailerInstance = new MailerClass();
    }
    
    init() {
        this.initDependencies(); 
    }

    async mapScraperScanHandler(req: FastifyRequest, res: FastifyReply) {
        let params : any = { ...req.query as object};

        params.regioni = params?.regioni.length > 0 ? params?.regioni[0]?.split(',') : [];
        params.province = params?.province.length > 0 ? params?.province[0]?.split(',') : [];
        params.comuni = params?.comuni?.length > 0 ? params?.comuni[0]?.split(',') : [];
        

        try {
            const result = await this.mapScraperInstance?.runMaps(params);
            return res.send(JSON.stringify(result));
        } catch (error: Error | any) {
            console.log(error);
            res.statusCode = 500
            return res.send(error.message);
        }
    }

    async getExtractionHandler(req: FastifyRequest, res: FastifyReply) {
        const queryParams = req.query as any;
        // const clean = Object.keys(queryParams).includes("clean")
        //     ? queryParams?.clean
        //     : false
        // const result = await this.mapScraperInstance?.getExportByMaps(
        //     queryParams?.filename || "",
        //     clean,
        //     queryParams?.fields[0].split(",") || [],
        //     queryParams.flatten || false
        // )

        const fields: string = queryParams.fields.length ? queryParams.fields[0].split(",") : null;
        const builtFields: any = {};
        if (fields) {
            for (const field of fields) {
                builtFields[field] = 1;
            }
        }
        try {

            const estateAgencyQuery = this.entitiesInstance?.estateAgencyModel?.find({});

            let result = null

            if (estateAgencyQuery) {
                const query = fields ? estateAgencyQuery.select(builtFields) : estateAgencyQuery;
                result = await query.lean();
            }
            return res.send({ status: true, result });
        } catch (error: any) {
            console.log(error);
            res.statusCode = 500
            return res.send(error.message);
        }

    }


    async updateSingleDataHandler(req: FastifyRequest, res: FastifyReply) {
        const params: any = req.params;
        const { id } = params;
        const data: any = req.body;
        try {
            const updated = await this.entitiesInstance?.estateAgencyModel?.findByIdAndUpdate(id, data, { new: true });
            return res.send({ status: true, result: updated });
        } catch (error: any) {
            console.log(error);
            res.statusCode = 500
            return res.send(error.message);
        }
    }

    async sendEmailHandler(req: FastifyRequest, res: FastifyReply) {
        console.log("SENDING MAIL ")
        let body = req.body as any;
        let id = body.id;
        let isHtml = !body?.content ? true : body.isHtml;
        let emailOptions = body.emailOptions;
        let emailReplacements = body.emailReplacements || { "name": "None" };
        let content = body.content || await this.mailerInstance?.loadTemplate('email_template', emailReplacements);

        const options = {
            from: emailOptions?.from || process.env.MAILER_FROM,
            [isHtml ? "html" : "text"]: content,
            ...emailOptions
        }

        try {
            await this.mailerInstance?.sendMail(options);
            if (id) {
                const objectID = this.entitiesInstance.createObjectID(id);
                const updated = await this.entitiesInstance?.estateAgencyModel?.updateOne({ _id: objectID }, { $set: { "email_sent": true } });
            }
            return { status: true, result: { slug: "email-sent" } };
        } catch (error: any) {
            console.log(error);
            res.statusCode = 500
            return { error: error.message }
        }
    }


    async getEmailTemplateHandelr(req: FastifyRequest, res: FastifyReply) {
        const params: any = req.params;
        try {
            const result = await this.mailerInstance?.loadTemplate('email_template', {});
            return { status: true, result }
        } catch (error: any) {
            console.log(error);
            res.statusCode = 500
            return { error: error.message };
        }
    }

}
