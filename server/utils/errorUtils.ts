import mongoose from 'mongoose';
import { typeCheck } from './typeValidation.js';
import { fieldErrorMessages } from '@shared/fieldRules.js';
import { FILE_FIELD_MAP } from '@server/config/constants.js';
import type { IAppErrorData, TFieldErrors, IValidationErrors } from '@server/types/index.js';
import type { TEntityType } from '@shared/types/index.js';

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
) => {
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

export const parseValidationErrors = (err: any, entityType: TEntityType): IValidationErrors => {
    const fieldErrors: TFieldErrors = {};

    if (!err.errors) return { unknownFieldError: null, fieldErrors: null };

    for (const field in err.errors) {
        const error = err.errors[field]; // В валидаторе Mongoose используется полный путь поля

        if (field === 'globalFiles' && entityType in FILE_FIELD_MAP) {
            const message = error.message || 'Неизвестная ошибка файлового поля';
            const fileFields = FILE_FIELD_MAP[entityType as keyof typeof FILE_FIELD_MAP];
            fileFields.forEach(field => fieldErrors[field] = message);
            continue;
        }

        // Если поле вложено field будет иметь вид дот-нотации ('delivery.shippingAddress.city')
        const fieldName = field.includes('.') ? (field.split('.').pop() as string) : field;
        const messages = fieldErrorMessages[entityType]?.[fieldName];

        if (!messages) {
            return {
                unknownFieldError: createAppError(400, `Неизвестная ошибка поля: ${fieldName}`),
                fieldErrors: null
            };
        }

        if (error.kind === 'unique') {
            fieldErrors[fieldName] =
                messages.unique ||
                fieldErrorMessages.DEFAULT;
        } else if (error.kind === 'user defined') {
            const errorType = error.message; // Тип ошибки передаётся через сообщение

            if (errorType && errorType in messages) {
                fieldErrors[fieldName] = messages[errorType];
            } else {
                fieldErrors[fieldName] =
                    messages.default ||
                    fieldErrorMessages.DEFAULT;
            }
        } else {
            fieldErrors[fieldName] =
                messages.mismatch ||
                messages.default ||
                fieldErrorMessages.DEFAULT;
        }
    }

    return Object.keys(fieldErrors).length > 0 
        ? { unknownFieldError: null, fieldErrors } 
        : { unknownFieldError: null, fieldErrors: null };
};
