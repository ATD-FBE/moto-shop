import { ERROR_SIGNALS } from '@server/config/constants.js';

export const requestTimeout = (duration) => (req, res, next) => {
    res.setTimeout(duration, () => {
        req.connectionTimeout = true;

        const error = new Error('Время выполнения запроса истекло');
        error.statusCode = 408;
        next(error);
    });
    
    next();
};

export const checkTimeout = (req) => {
    if (req.connectionTimeout) {
        const error = new Error(ERROR_SIGNALS.TIMEOUT_ABORT);
        error.isTimeoutAbort = true; 
        throw error;
    }
};
