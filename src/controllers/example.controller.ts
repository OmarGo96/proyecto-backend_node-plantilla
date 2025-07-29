import { Response, Request } from 'express'
import { JsonResponse } from '../enums/jsonResponse'
import { Crypto } from '../helpers/crypto'
import { FileManager } from '../helpers/files'
import csv from 'csv-parser'
import jwt from 'jsonwebtoken'
import fs from 'fs'



export class ExampleController {
    static crypto: Crypto = new Crypto()
    static fileManager: FileManager = new FileManager()

    public async awsS3Upload(req: Request, res: Response) {
        let result = await ExampleController.fileManager.upload(req, 'CONTRACT')

        return res.status(200).json({
            ok: true
        })
    }

    public async awsS3Download(req: Request, res: Response) {
        let result = await ExampleController.fileManager.download('example.pdf', 'CONTRACT')

        return res.status(JsonResponse.OK).contentType('application/pdf').end(result, 'binary')
    }

    public async example(req: Request, res: Response) {
        return res.status(200).json({
            ok: true,
            message: 'Hola mundo, Soy un ejemplo!'
        })
    }

    public async users(req: Request, res: Response) {
        return res.status(JsonResponse.OK).json({
            ok: true,
            users: [
                { 'name': 'Xavier', 'password': 'Xavier123--' },
                { 'name': 'Peter', 'password': 'Peter123--' },
                { 'name': 'María', 'password': 'Maria123--' },
                { 'name': 'Jhon', 'password': 'Jhon123--' },
                { 'name': 'Adele', 'password': 'Adele123--' },
            ]
        })
    }

    public async readExcel(req: Request, res: Response) {
        let info = []
        let excel = fs.createReadStream('./files/excel/example.csv')
        excel.pipe(csv())
            .on('data', (data) => info.push(data))
            .on('end', () => {
                console.log(info);
            });
    }

    public async encrypt(req: Request, res: Response) {
        let result = await ExampleController.crypto.encryptInformation(req.body)

        return res.status(200).json({
            ok: true,
            data: result.data,
            key: result.key
        })
    }

    public async decrypt(req: Request, res: Response) {
        let result = await ExampleController.crypto.decryptInformation(req.body.key, req.body.data)

        return res.status(200).json({
            ok: true,
            data: result.data
        })
    }
}