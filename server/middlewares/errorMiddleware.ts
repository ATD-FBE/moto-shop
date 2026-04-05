import log from '@server/utils/logger.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { toError } from '@shared/commonHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
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
    if (error.isTimeoutAbort) return;

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
