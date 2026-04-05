import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus } from '@shared/types/index.js';

export const NETWORK_FAIL_STATUS_CODE = 520; // Свободный код для сетевой ошибки

export const resolveRequestStatus = (statusCode: number, reason?: TRequestStatus): TRequestStatus => {
    switch (statusCode) {
        case 200:
        case 201:
            return REQUEST_STATUS.SUCCESS;

        case 204:
            return REQUEST_STATUS.UNCHANGED;

        case 207:
            return REQUEST_STATUS.PARTIAL;

        case 400:
            if (reason === REQUEST_STATUS.NO_SELECTION) return REQUEST_STATUS.NO_SELECTION;
            return REQUEST_STATUS.BAD_REQUEST;

        case 401:
            return REQUEST_STATUS.UNAUTH;

        case 402: // YooKassa - Ошибка подключения к API
            return REQUEST_STATUS.NETWORK;

        case 403:
            if (reason === REQUEST_STATUS.DENIED) return REQUEST_STATUS.DENIED;
            return REQUEST_STATUS.FORBIDDEN;

        case 404:
            return REQUEST_STATUS.NOT_FOUND;

        case 409:
            return REQUEST_STATUS.CONFLICT;

        case 410:
            if (reason === REQUEST_STATUS.USER_GONE) return REQUEST_STATUS.USER_GONE;
            return REQUEST_STATUS.ERROR;

        case 412:
            return REQUEST_STATUS.MODIFIED;

        case 422:
            if (reason === REQUEST_STATUS.LIMITATION) return REQUEST_STATUS.LIMITATION;
            return REQUEST_STATUS.INVALID;

        case 499: // Происходит только при переходе на другую страницу с активными запросами
            return REQUEST_STATUS.ABORTED;

        case 500:
            return REQUEST_STATUS.ERROR;

        case NETWORK_FAIL_STATUS_CODE:
            if (reason === REQUEST_STATUS.TIMEOUT) return REQUEST_STATUS.NETWORK;
            return REQUEST_STATUS.ERROR;

        default:
            return REQUEST_STATUS.ERROR;
    }
};
