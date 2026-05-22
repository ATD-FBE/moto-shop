import { PROD_ENV } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ILogRequestStatusConfig {
    context?: string;
    status?: TRequestStatus;
    message?: string;
    details?: unknown;
    unhandled?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const logRequestStatus = (
    { context, status, message, details, unhandled = false }: ILogRequestStatusConfig
): void => {
    const contextText = context ? `[${context.toUpperCase()}] ` : '';
    const statusText = `[${status ? status.toUpperCase() : '???'}]`;
    const messageText = message || '<нет сообщения>';

    if (unhandled) {
        return console.error(`${contextText}Необработанный статус: ${statusText}. ${messageText}`);
    }

    const formattedMessage = `${contextText}${statusText} ${messageText}${details ? ':' : ''}`;
    const logArgs: any[] = [formattedMessage];
    
    if (details) logArgs.push(details);

    switch (status) {
        case REQUEST_STATUS.SUCCESS:
        case REQUEST_STATUS.PARTIAL:
            if (!PROD_ENV) console.log(...logArgs);
            break;

        case REQUEST_STATUS.UNAUTH:
        case REQUEST_STATUS.USER_GONE:
        case REQUEST_STATUS.DENIED:
        case REQUEST_STATUS.BAD_REQUEST:
        case REQUEST_STATUS.NOT_FOUND:
        case REQUEST_STATUS.NO_SELECTION:
        case REQUEST_STATUS.LIMITATION:
        case REQUEST_STATUS.CONFLICT:
        case REQUEST_STATUS.MODIFIED:
        case REQUEST_STATUS.UNCHANGED:
        case REQUEST_STATUS.INVALID:
            if (!PROD_ENV) console.warn(...logArgs);
            break;

        case REQUEST_STATUS.ERROR:
        case REQUEST_STATUS.TIMEOUT:
            console.error(...logArgs);
            break;

        default:
            console.error(`${contextText}Неизвестный статус: ${statusText}. ${messageText}`);
            break;
    }
};

export const logMissingProps = (componentName: string, props: Record<string, unknown>): void => {
    const missingProps = Object.entries(props)
        .filter(([_, value]) => value === undefined || value === null)
        .map(([key]) => key);

    if (missingProps.length > 0) {
        console.error(
            `[${componentName}] Отсутствуют критические пропсы и/или свойства объектов: `+
            `${missingProps.join(', ')}`
        );
    }
};
