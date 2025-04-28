import { fromEnv } from "@aws-sdk/credential-providers";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs'
import moment from 'moment'
import colors from 'colors'
import * as Sentry from "@sentry/node";

export class FileManager {

    private s3Client

    constructor() {
        this.s3Client = new S3Client({
            credentials: fromEnv(),
            region: process.env.AWS_REGION
        })
    }

    public upload() {
        let path: string = process.env.FILE_PATH + 'DT1-009928.pdf'
        let file: any = null

        try {
            file = fs.readFileSync(path)

            const paramsS3 = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: 'DT1-009928.pdf',
                Body: file,
                ContentType: 'application/pdf',
                //ACL: 'public-read'
            })

            const response = this.s3Client.send(paramsS3);

            return { ok: true, response }

        } catch (e) {
            Sentry.captureException(e);
            console.error(colors.red('Error AWS a las: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e));
            return { ok: false }
        }
    }

    public async download() {

        try {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: "DT1-009928.pdf",
            });

            const response = await this.s3Client.send(command)
            const pdf = await response.Body.transformToByteArray();
            //const new_file = await fs.writeFileSync(process.env.FILE_PATH + 'SRX-001076.pdf', cano)
            return { ok: true, pdf }

        } catch (e) {
            Sentry.captureException(e);
            console.error(colors.red('Error AWS a las: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e));
            return { ok: false }
        }

    }

    public async destroy() {

        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: "DT1-009928.pdf",
            });

            const response = await this.s3Client.send(command)
            
            return { ok: true }
        } catch (e) {
            Sentry.captureException(e);
            console.error(colors.red('Error AWS a las: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e));
        }


    }
}