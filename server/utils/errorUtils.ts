import mongoose from 'mongoose';
import { typeCheck } from '../validation/validationEngine.js';
import { isValidEntityField } from './typeGuards.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { GENERIC_FILE_FIELD, ENTITY_FILE_FIELDS } from '@server/config/constants.js';
import type {
    TRequestStatus,
    TBaseResponse,
    TPlainErrorResponse,
    TEntityType,
    TFieldErrors
} from '@shared/types/index.js';
import type { THttpStatusCode, TCodeToStatusMap, TInferPayload } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TAppErrorDetails<
    R extends TBaseResponse,
    N extends number,
    S extends TRequestStatus
> = Omit<TInferPayload<R, N, S>, 'message'>;

interface IAppError<
    R extends TBaseResponse,
    N extends number,
    S extends TRequestStatus
> extends Error {
    isAppError: true;
    statusCode: N;
    details?: TAppErrorDetails<R, N, S>;
}

interface IAppErrorData {
    message: string;
    [key: string]: unknown;
}

interface IParseValidationErrorsResult<E extends TEntityType = TEntityType> {
    fieldErrors: TFieldErrors<E>;
    systemFieldErrors: string[];
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const isCriticalError = (error: Error): boolean => {
    return (
        error instanceof mongoose.Error ||
        error.name === 'MongoServerError' ||
        error.code === 'ECONNREFUSED'
    );
};

export const createAppError = <
    R extends TBaseResponse = TPlainErrorResponse,
    N extends number = number,
    S extends TRequestStatus = TCodeToStatusMap<N>
>(
    statusCode: N,
    message: string = '',
    details?: TAppErrorDetails<R, N, S>
): IAppError<R, N, S> => {
    const error = new Error(message) as IAppError<R, N, S>;
    error.isAppError = true;
    error.statusCode = statusCode;
    if (details) error.details = details;
    return error;
};

export const prepareAppErrorData = (err: Error): IAppErrorData => ({
    message: err.message,
    ...(typeCheck.object(err.details) ? err.details : { details: err.details })
});

export const parseValidationErrors = <E extends TEntityType>(
    err: mongoose.Error.ValidationError, 
    entityType?: E
): IParseValidationErrorsResult<E> => {
    const fieldErrors: TFieldErrors<E> = {};
    const systemFieldErrors: string[] = [];

    for (const field in err.errors) {
        const error = err.errors[field]; // В валидаторе Mongoose используется полный путь поля

        if (field === GENERIC_FILE_FIELD && entityType && entityType in ENTITY_FILE_FIELDS) {
            const message = error?.message || 'Неизвестная ошибка файлового поля';
            const fileFields = ENTITY_FILE_FIELDS[entityType as keyof typeof ENTITY_FILE_FIELDS];
            
            fileFields.forEach(fieldName => {
                if (fieldName in fieldErrorMessages[entityType]) {
                    fieldErrors[fieldName as keyof TFieldErrors<E>] = message;
                }
            });
            continue;
        }

        // Если поле вложено, field будет иметь вид дот-нотации ('delivery.shippingAddress.city')
        const fieldName = field.includes('.') ? field.split('.').pop()! : field;

        if (entityType && isValidEntityField(entityType, fieldName)) {
            const messageTypes = fieldErrorMessages[entityType][fieldName];
            
            if (error?.kind === 'unique') {
                fieldErrors[fieldName] = messageTypes.unique || DEFAULT_FIELD_ERROR_MESSAGE;
            } else if (error?.kind === 'user defined') {
                const errorType = error.message; // Тип ошибки передаётся через сообщение

                fieldErrors[fieldName] = (errorType && errorType in messageTypes) 
                    ? messageTypes[errorType] 
                    : (messageTypes.default || DEFAULT_FIELD_ERROR_MESSAGE);
            } else {
                fieldErrors[fieldName] =
                    messageTypes.mismatch ||
                    messageTypes.default ||
                    DEFAULT_FIELD_ERROR_MESSAGE;
            }
        } else {
            systemFieldErrors.push(`${field}: ${error?.message || 'Ошибка системного поля'}`);
        }
    }

    return { fieldErrors, systemFieldErrors };
};
