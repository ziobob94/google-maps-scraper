import mongoose, { Schema, Document } from "mongoose";

import config, { IConfig } from 'config';
import { EstateAgencySchema } from "./schemas/estateAgency";
import { MapQueryResult } from "../../lib/scraper/index.d";
import { LoggerClass } from "../../lib/LoggerClass";

export class MongoWrapperClass {
    parent: any;
    config: IConfig;
    mongoClient: any | null;
    logger: LoggerClass | null;

    estateAgencyModel: mongoose.Model<MapQueryResult & Document> | null = null;

    constructor(parent: any) {
        this.parent = parent;
        this.config = parent?.config || config;
        this.logger = parent?.logger || new LoggerClass(this.config);
        this.mongoClient = null;
        this.init()
    }

    init() {
        const _this = this;

        this.connectMongo()
            .then(() => {
                _this.initDependencies();
            })
    }

    initDependencies() {
        this.setupModels();
    }

    async connectMongo() {
        let retry = 0;
        while (retry < (this.config.get('mongodb.max_retry') as number) || 5) {
            try {
                this.logger?.log("[MongoWrapperClass] Connecting to MongoDB");
                this.mongoClient = await mongoose.connect(this.config.get('mongodb.uri'), {});
                break;
            } catch (error) {
                this.logger?.log(`[MongoWrapperClass] Could not connect to MongoDB: ${error}, retrying in 1 second`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.mongoClient = null;
            }
            retry++;
        }
        if (!this.mongoClient) throw new Error("Could not connect to MongoDB");
        this.logger?.log("[MongoWrapperClass] Connected to MongoDB");

    }

    setupModels() {
        this.estateAgencyModel = mongoose.model<MapQueryResult & Document>('EstateAgency', EstateAgencySchema);
    }


    createObjectID(id: string) {
        if (!id) return new mongoose.Types.ObjectId();
        else return new mongoose.Types.ObjectId(id);
    }


}