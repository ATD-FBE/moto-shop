import { resolveRequestStatus } from '@shared/statusResolver.js';
import { REQUEST_STATUS } from '@shared/constants.js';

const apiResponse = async (response, extra = {}) => {
    const { errorPrefix = '', asFile = false, ...extraRest } = extra;

    // Пустое тело запроса 204 (No Content)
    if (response.status === 204) {
        return {
            status: REQUEST_STATUS.UNCHANGED,
            message: 'Данные не изменены, сохранять нечего',
            ...extraRest
        };
    }

    const contentType = response.headers.get('Content-Type') || '';
    const isJsonResponse = contentType.includes('application/json');

    // JSON-ответ (при ошибке загрузки файла содержит данные ошибки)
    if (isJsonResponse) {
        let data = {};

        try { 
            data = await response.json(); 
        } catch (err) {
            console.error('Ошибка парсинга JSON:', err);
        }

        const { status, message, reason, ...dataRest } = data;
        const safeStatus = status || resolveRequestStatus(response.status, reason);
        const safeMessage = message || (response.ok ? 'OK' : `Ошибка сервера (${response.status})`);
    
        return {
            status: safeStatus || (response.ok ? REQUEST_STATUS.SUCCESS : REQUEST_STATUS.ERROR),
            message: !response.ok && errorPrefix ? `${errorPrefix}: ${safeMessage}` : safeMessage,
            ...extraRest,
            ...dataRest
        };
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
        };
    }

    // Текстовый ответ
    const text = await response.text();
    
    return {
        status: resolveRequestStatus(response.status),
        text,
        ...extraRest
    };
};

export default apiResponse;
