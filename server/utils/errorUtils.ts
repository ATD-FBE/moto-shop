import mongoose from 'mongoose';
import { typeCheck } from './typeValidation.js';
import { isValidEntityField } from './typeGuards.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { FILE_FIELD_MAP } from '@server/config/constants.js';
import type { IAppErrorData, IParseValidationErrorsResult } from '@server/types/index.js';
import type { TEntityType, TFieldErrors } from '@shared/types/index.js';

export const isCriticalError = (error: Error): boolean => {
    return (
        error instanceof mongoose.Error ||
        error.name === 'MongoServerError' ||
        error.code === 'ECONNREFUSED'
    );
};

export const createAppError = (
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
): Error => {
    const error = new Error(message);
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
    entityType: E
): IParseValidationErrorsResult<E> => {
    const fieldErrors: TFieldErrors<E> = {};

    for (const field in err.errors) {
        const error = err.errors[field]; // В валидаторе Mongoose используется полный путь поля

        if (field === 'globalFiles' && entityType in FILE_FIELD_MAP) {
            const message = error.message || 'Неизвестная ошибка файлового поля';
            const fileFields = FILE_FIELD_MAP[entityType as keyof typeof FILE_FIELD_MAP];
            
            fileFields.forEach(fieldName => {
                if (fieldName in fieldErrorMessages[entityType]) {
                    fieldErrors[fieldName as keyof TFieldErrors<E>] = message;
                }
            });
            continue;
        }

        // Если поле вложено field будет иметь вид дот-нотации ('delivery.shippingAddress.city')
        const fieldName = field.includes('.') ? (field.split('.').pop() as string) : field;

        if (isValidEntityField(entityType, fieldName)) {
            const messages = fieldErrorMessages[entityType][fieldName];
            
            if (error.kind === 'unique') {
                fieldErrors[fieldName] = messages.unique || DEFAULT_FIELD_ERROR_MESSAGE;
            } else if (error.kind === 'user defined') {
                const errorType = error.message; // Тип ошибки передаётся через сообщение

                fieldErrors[fieldName] = (errorType && errorType in messages) 
                    ? (messages as any)[errorType] 
                    : (messages.default || DEFAULT_FIELD_ERROR_MESSAGE);
            } else {
                fieldErrors[fieldName] = messages.mismatch || messages.default || DEFAULT_FIELD_ERROR_MESSAGE;
            }
        } else {
            return {
                systemFieldError: createAppError(400, `Ошибка системного поля ${fieldName}: ${error.message}`),
                fieldErrors: null
            };
        }
    }

    return Object.keys(fieldErrors).length > 0 
        ? { systemFieldError: null, fieldErrors } 
        : { systemFieldError: null, fieldErrors: null };
};
