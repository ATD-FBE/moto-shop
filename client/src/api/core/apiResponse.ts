import { resolveRequestStatus } from '@shared/statusResolver.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { IApiResponseExtraConfig } from '@/types/index.js';
import type { TRequestStatus, TBaseResponse } from '@shared/types/index.js';

const apiResponse = async <T extends TBaseResponse>(
    response: Response,
    extra: IApiResponseExtraConfig = {}
): Promise<T> => {
    const { errorPrefix = '', asFile = false, ...extraRest } = extra;

    // Пустое тело запроса 204 (No Content)
    if (response.status === 204) {
        return {
            status: REQUEST_STATUS.UNCHANGED,
            message: 'Данные не изменены, сохранять нечего',
            ...extraRest
        } as T;
    }

    const contentType = response.headers.get('Content-Type') || '';
    const isJsonResponse = contentType.includes('application/json');

    // JSON-ответ (при ошибке загрузки файла содержит данные ошибки)
    if (isJsonResponse) {
        let data: Partial<T> = {};

        try { 
            data = await response.json(); 
        } catch (err) {
            console.error('Ошибка парсинга JSON:', err);
        }

        const { status, message, reason, ...dataRest }: {
            status?: TRequestStatus;
            message?: string;
            reason?: TRequestStatus;
            [key: string]: unknown;
        } = data;

        const safeStatus = status || resolveRequestStatus(response.status, reason);
        const safeMessage = message || (response.ok ? 'OK' : `Ошибка сервера (${response.status})`);
    
        return {
            status: safeStatus || (response.ok ? REQUEST_STATUS.SUCCESS : REQUEST_STATUS.ERROR),
            message: !response.ok && errorPrefix ? `${errorPrefix}: ${safeMessage}` : safeMessage,
            ...dataRest,
            ...extraRest
        } as T;
    }

    // Бинарные данные в ответе
    if (asFile) {
        const blob = await response.blob();

        const contentDisposition = response.headers.get('Content-Disposition') || '';
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'file';

        return {
            status: REQUEST_STATUS.SUCCESS,
            message: 'Файл успешно загружен',
            blob,
            filename,
            ...extraRest
        } as unknown as T;
    }

    // Текстовый ответ
    const text = await response.text();
    
    return {
        status: resolveRequestStatus(response.status),
        message: response.ok ? 'OK' : 'Error',
        text,
        ...extraRest
    } as unknown as T;
};

export default apiResponse;
