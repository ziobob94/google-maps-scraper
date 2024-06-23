/* eslint-disable no-unused-vars */
import { IConfig } from 'config';
import winston, { Logger } from 'winston';
//import path from "path";
import 'winston-daily-rotate-file';
import{ FastifyRequest, FastifyReply } from 'fastify'


export class LoggerClass {
    config: IConfig;
    logger: Logger | undefined;
    webLogger: Logger | undefined;

    constructor(configuration: any) {
        this.config = configuration;

        const plainFormat = winston.format.printf(({ level, message, label, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        });

        const consoleFormat = winston.format.printf(({ level, message }) => {
            return `${level}: ${message}`;
        });

        if(this.config.get('logging.fileLogger'))
            this.logger = winston.createLogger({
                level: 'info',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    plainFormat
                ),
                defaultMeta: { service: 'user-service' },
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            consoleFormat
                        ),
                    }),
                    new (winston.transports.DailyRotateFile)({
                        level: 'error',
                        filename: 'error-%DATE%.log',
                        zippedArchive: true,
                        dirname: this.config.get('logging.path.application'),
                        datePattern: this.config.get('logging.dataPattern'),
                        maxFiles: this.config.get('logging.rotation'),
                        maxSize: this.config.get('logging.maxSize'),
                    }),
                    new (winston.transports.DailyRotateFile)({
                        filename: 'adm-%DATE%.log',
                        zippedArchive: true,
                        dirname: this.config.get('logging.path.application'),
                        datePattern: this.config.get('logging.dataPattern'),
                        maxFiles: this.config.get('logging.rotation'),
                        maxSize: this.config.get('logging.maxSize'),
                    })
                ],
            });
            
        if(this.config.get('logging.webLogger'))
            this.webLogger = winston.createLogger({
                level: 'info',
                format: winston.format.combine(
                    winston.format.label({ label: 'right meow!' }),
                    winston.format.timestamp(),
                    plainFormat
                ),
                defaultMeta: { service: 'user-service' },
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            consoleFormat
                        ),
                    }),
                    new (winston.transports.DailyRotateFile)({
                        filename: 'adm-web-%DATE%.log',
                        zippedArchive: true,
                        dirname: this.config.get('logging.path.request'),
                        datePattern: this.config.get('logging.dataPattern'),
                        maxFiles: this.config.get('logging.rotation'),
                        maxSize: this.config.get('logging.maxSize'),
                    }),
                ],
            });
    }



    log(data: any, level = 'info',) {
        this.logger?.log({
            level: level,
            message: data
        });
    }


    trackWebRequest(req: FastifyRequest, reply: FastifyReply) {
        this.webLogger?.info('REQ: ' + req.method + ' ' + req.url);
    }

}


// 


// const