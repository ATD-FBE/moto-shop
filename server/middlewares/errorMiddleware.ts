import log from '@server/utils/logger.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { prepareAppErrorData } from '@server/utils/errorUtils.js';
import { parseValidationErrors } from '@server/utils/errorUtils.js';
import { isAppError, isMongooseValidationError } from '@server/utils/typeGuards.js';
import { toError } from '@shared/commonHelpers.js';
import type { RequestHandler, ErrorRequestHandler } from 'express';

export const errorTracker: RequestHandler = (req, res, next) => {
    req.connectionAborted = false;
    req.connectionTimeout = false;

    log.info(`Request: ${req.reqCtx}`);

    res.on('close', () => {
        if (!res.writableFinished) {
            req.connectionAborted = true; 
            log.warn(`${req.reqCtx} - Соединение было прервано клиентом`);
        }
    });

    req.on('error', (err) => {
        if (req.connectionAborted) return;
        log.error(`${req.reqCtx} - Ошибка запроса: ${err.message}`);
    });

    res.on('error', (err) => {
        if (req.connectionAborted) return;
        log.error(`${req.reqCtx} - Ошибка ответа: ${err.message}`);
    });
    
    next();
};

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const error = toError(err);

    // Пропуск ошибки чекера таймаута, так как до него сработала ошибка таймаута запроса
    if (error.isTimeoutCheck) return;

    // Обработка контролируемой ошибки
    if (isAppError(error)) {
        return safeSendResponse(res, error.statusCode, prepareAppErrorData(error));
    }

    // Обработка ошибок валидации полей при сохранении в MongoDB
    if (isMongooseValidationError(error)) {
        const { fieldErrors, systemFieldErrors } = parseValidationErrors(error, req.entityType);
        const errLbl = '[Mongoose Validation Error]';
    
        if (Object.keys(fieldErrors).length > 0) {
            return safeSendResponse(res, 422, { message: `${errLbl} Некорректные данные`, fieldErrors });
        }

        if (systemFieldErrors.length > 0) {
            log.error(`${req.reqCtx} - ${errLbl} - Системные ошибки валидации:`, systemFieldErrors);
            return safeSendResponse(res, 500, { message: `${errLbl} Внутренняя ошибка сервера` });
        }
    }

    // Обработка неизвестной ошибки
    const statusCode = error.statusCode || 500;
    const isServerError = statusCode >= 500;
    const reqCtxStatus = `${req.reqCtx} - Status: ${statusCode}`;

    if (isServerError) {
        log.error(`${reqCtxStatus} - Ошибка сервера:`, error);
    } else {
        const errorDescription = statusCode === 408 ? 'Таймаут запроса' : 'Ошибка клиента';
        log.warn(`${reqCtxStatus} - ${errorDescription}: ${error.message}`);
    }

    const errorMessage = error.message || (isServerError ? 'Ошибка сервера!' : 'Ошибка запроса!');
    safeSendResponse(res, statusCode, { message: errorMessage });
};
