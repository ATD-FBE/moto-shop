import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus } from '@shared/types/index.js';

export const resolveRequestStatus = (statusCode: number, reason?: TRequestStatus): TRequestStatus => {
    switch (statusCode) {
        case 200:
        case 201:
            return REQUEST_STATUS.SUCCESS;

        case 204:
        case 205:
        case 304:
            return REQUEST_STATUS.UNCHANGED;

        case 207:
            return REQUEST_STATUS.PARTIAL;

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
};
