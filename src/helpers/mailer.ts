import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import moment from 'moment'
import * as Sentry from "@sentry/node";
/**
 * Clase para el envío de correos electrónicos usando nodemailer y plantillas handlebars.
 */
export class Mailer {


    /** Transportador de nodemailer para el envío de correos */
    private transporter;
    /** Configuración de handlebars para plantillas de correo */
    private hbsConfig;

    /**
     * Inicializa el transporter de nodemailer y la configuración de handlebars.
     */
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
        })

        this.hbsConfig = {
            viewEngine: {
                extName: '.hbs',
                partialsDir: path.join(__dirname, '../../files/templates/'),
                layoutsDir: path.join(__dirname, '../../files/templates/'),
                defaultLayout: ''
            },
            viewPath: path.join(__dirname, '../../files/templates/'),
            extName: '.hbs'
        };
    }


    /**
     * Envía un correo electrónico usando una plantilla handlebars.
     * @param data Objeto con las propiedades: email, subject, template, context
     * @returns Objeto con estado y error si ocurre
     */
    public async send(data) {
        //let config = this.transporter.use('compile', hbs(this.hbsConfig))
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: data.email,
            subject: data.subject,
            template: data.template,
            context: { data }
        }

        try {
            let sendEmail = await this.transporter.sendMail(mailOptions)
            return { ok: true }
        } catch (e) {
            Sentry.captureException(e);
            console.log('Error mailer a las: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e)
            return { ok: false, error: e }
        }

    }
}