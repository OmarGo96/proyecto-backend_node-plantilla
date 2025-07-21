import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import moment from 'moment';
import * as Sentry from '@sentry/node';

/**
 * Helper para realizar peticiones HTTP usando Axios con manejo de errores y logs.
 */
export class Axios {
    /**
     * Realiza una petición HTTP y retorna un objeto con el resultado.
     * @param config Configuración de la petición Axios
     */
    /**
     * Realiza una petición HTTP y retorna un objeto con el resultado.
     * @param config Configuración de la petición Axios
     */
    public async getResponse<T = any>(config: AxiosRequestConfig): Promise<{ ok: boolean; result: T | string }> {
        if (!config || typeof config !== 'object' || !config.url) {
            return {
                ok: false,
                result: 'Configuración de petición inválida o faltante',
            };
        }
        try {
            const response: AxiosResponse<T> = await axios(config);
            return {
                ok: true,
                result: response.data,
            };
        } catch (e: any) {
            Sentry.captureException(e);
            const errorMsg = e?.response?.data?.message || e?.message || 'Error desconocido';
            console.error(`Error axios a las: ${moment().format('YYYY-MM-DD HH:mm:ss')},`, errorMsg);
            return {
                ok: false,
                result: 'Existe un problema al momento de conectarse con el servidor externo',
            };
        }
    }
}