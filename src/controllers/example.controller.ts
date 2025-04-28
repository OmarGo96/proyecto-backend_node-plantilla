import { Response, Request } from 'express'
import { JsonResponse } from '../enums/jsonResponse'
import { Crypto } from '../helpers/crypto'
import { FileManager } from '../helpers/files'
import jwt from 'jsonwebtoken'
import fs from 'fs'



export class ExampleController {
    static crypto: Crypto = new Crypto()
    static fileManager: FileManager = new FileManager()

    public async awsS3Upload(req: Request, res: Response) {
        let result = await ExampleController.fileManager.upload()

        return res.status(200).json({
            ok: true
        })
    }

    public async awsS3Download(req: Request, res: Response) {
        let result = await ExampleController.fileManager.download()
        
        return res.status(JsonResponse.OK).contentType('application/pdf').end(result, 'binary')
    }

    public async awsS3Destroy(req: Request, res: Response) {
        let result = await ExampleController.fileManager.destroy()

        return res.status(200).json({
            ok: true
        })
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
}