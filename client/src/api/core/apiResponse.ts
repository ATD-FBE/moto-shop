import { resolveRequestStatus } from '@shared/statusResolver.js';
import { toError } from '@shared/commonHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { IApiResponseExtraConfig } from '@/types/index.js';
import type { TRequestStatus, TBaseResponse } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParsedResponse = TBaseResponse & {
    blob?: Blob | null;
    filename?: string;
    text?: string | null;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const apiResponse = async <T extends TParsedResponse >(
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
            console.error('Ошибка парсинга JSON:', toError(err));
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
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            const errorMessage = errorText || 'Ошибка загрузки файла';

            return {
                status: resolveRequestStatus(response.status),
                message: errorPrefix ? `${errorPrefix}: ${errorMessage}` : errorMessage,
                ...extraRest
            } as T;
        }
        
        const contentDisposition = response.headers.get('Content-Disposition') || '';
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'file';
        let blob: Blob | null = null;

        try {
            blob = await response.blob();
        } catch (err) {
            console.error('Ошибка парсинга файла:', toError(err));
        }

        return {
            status: blob ? REQUEST_STATUS.SUCCESS : REQUEST_STATUS.ERROR,
            message: blob ? 'Файл успешно загружен' : 'Ошибка парсинга файла',
            blob,
            filename,
            ...extraRest
        } as T;
    }

    // Текстовый ответ
    let text: string | null = null;

    try {
        text = await response.text();
    } catch (err) {
        console.error('Ошибка парсинга текста:', toError(err));
    }

    const safeMessage = response.ok ? 'OK' : text != null ? (text || 'Error') : 'Ошибка парсинга текста';
    
    return {
        status: text != null ? resolveRequestStatus(response.status) : REQUEST_STATUS.ERROR,
        message: !response.ok && errorPrefix ? `${errorPrefix}: ${safeMessage}` : safeMessage,
        text,
        ...extraRest
    } as T;
};

export default apiResponse;
