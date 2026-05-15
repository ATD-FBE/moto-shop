import { HTTP_STATUS_CODE_MAP, REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus } from '@shared/types/index.js';

/*export const resolveRequestStatus = (statusCode: number, reason?: TRequestStatus): TRequestStatus => {
    switch (statusCode) {
        case 200:
        case 201:
            return REQUEST_STATUS.SUCCESS;

        case 207:
            return REQUEST_STATUS.PARTIAL;

        case 204:
        case 205:
        case 304:
            return REQUEST_STATUS.UNCHANGED;

        case 400:
            if (reason === REQUEST_STATUS.NO_SELECTION) return REQUEST_STATUS.NO_SELECTION;
            return REQUEST_STATUS.BAD_REQUEST;

        case 401:
            return REQUEST_STATUS.UNAUTH;

        case 402: // YooKassa - Ошибка подключения к API
        case 408:
            return REQUEST_STATUS.TIMEOUT;

        case 403:
            if (reason === REQUEST_STATUS.DENIED) return REQUEST_STATUS.DENIED;
            return REQUEST_STATUS.FORBIDDEN;

        case 404:
            return REQUEST_STATUS.NOT_FOUND;

        case 409:
            return REQUEST_STATUS.CONFLICT;

        case 410:
            if (reason === REQUEST_STATUS.USER_GONE) return REQUEST_STATUS.USER_GONE;
            return REQUEST_STATUS.ERROR; // Данные удалены навсегда

        case 412:
            return REQUEST_STATUS.MODIFIED;

        case 422:
            if (reason === REQUEST_STATUS.LIMITATION) return REQUEST_STATUS.LIMITATION;
            return REQUEST_STATUS.INVALID;

        case 499: // При переходе на другую страницу с активными запросами
            return REQUEST_STATUS.ABORTED;

        case 500:
        default:
            return REQUEST_STATUS.ERROR;
    }
};*/

export const resolveRequestStatus = (statusCode: number, reason?: TRequestStatus): TRequestStatus => {
    const is = (key: keyof typeof HTTP_STATUS_CODE_MAP) =>
        HTTP_STATUS_CODE_MAP[key].some(code => code === statusCode);

    if (is('UNCHANGED')) return REQUEST_STATUS.UNCHANGED;

    if (is('AUTH')) {
        if (statusCode === 403) {
            return reason === REQUEST_STATUS.DENIED
                ? REQUEST_STATUS.DENIED
                : REQUEST_STATUS.FORBIDDEN;
        }
        if (statusCode === 410) {
            return reason === REQUEST_STATUS.USER_GONE
                ? REQUEST_STATUS.USER_GONE
                : REQUEST_STATUS.ERROR;
        }
        return REQUEST_STATUS.UNAUTH;
    }

    if (is('VALIDATION')) {
        return reason === REQUEST_STATUS.LIMITATION
            ? REQUEST_STATUS.LIMITATION
            : REQUEST_STATUS.INVALID;
    }

    if (is('MODIFIED')) return REQUEST_STATUS.MODIFIED;
    
    if (is('GENERAL')) {
        if (statusCode === 400) {
            return reason === REQUEST_STATUS.NO_SELECTION
                ? REQUEST_STATUS.NO_SELECTION
                : REQUEST_STATUS.BAD_REQUEST;
        }
        if (
            statusCode === 402 || // YooKassa - Ошибка подключения к API
            statusCode === 408
        ) return REQUEST_STATUS.TIMEOUT;
        if (statusCode === 404) return REQUEST_STATUS.NOT_FOUND;
        if (statusCode === 409) return REQUEST_STATUS.CONFLICT;
        if (statusCode === 499) return REQUEST_STATUS.ABORTED;
        if (statusCode === 500) return REQUEST_STATUS.ERROR;
    }

    if (is('SUCCESS')) {
        return statusCode === 207
            ? REQUEST_STATUS.PARTIAL
            : REQUEST_STATUS.SUCCESS;
    }

    return REQUEST_STATUS.ERROR;
};
