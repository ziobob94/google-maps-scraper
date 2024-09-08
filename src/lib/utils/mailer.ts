import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export class MailerClass {

    outlookTransporter: Transporter<SentMessageInfo> | null;
    defaultMailOptions: any;

    constructor() {
        this.outlookTransporter = null;
        this.defaultMailOptions = {
            from: process.env.MAILER_FROM,
        }
        this.init();
    }

    init() {
        this.initDependencies();

        this.outlookTransporter = nodemailer.createTransport({
            host: "smtp-mail.outlook.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAILER_USER,
                pass: process.env.MAILER_PASS
            },
        });
    }

    initDependencies() { }

    async loadTemplate(templateName: string, data = {}) {
        const emailTemplatePath = path.resolve(`./templates/${templateName}.html`);
        let emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
        if (data) {
            Object.entries(data).forEach(([k, v]: any) => {
                emailTemplate = emailTemplate.replace(`{{${k}}}`, v);
            });
        }
        return emailTemplate;
    }


    sendMail(mailOptions: any) {
        return this.outlookTransporter?.sendMail({ ...this.defaultMailOptions, ...mailOptions });
    }


}