import { RequestHandler } from 'express';
import { buildValidationConfig, validateObjectFields } from '@server/validation/validationEngine.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type {
    TCheckType,
    IValidationSchema,
    IValidationInputSchema,
    IValidationConfig
} from '@server/types/index.js';
import type { TEntityType } from '@shared/types/index.js';

export const validateInput = <E extends TEntityType = TEntityType>(
    schema: IValidationInputSchema<E>
): RequestHandler => (req, res, next) => {
    const { entityType, params, body, query } = schema;
    req.entityType = entityType;
    
    const validationConfigMap: Record<string, IValidationConfig> = {};

    if (params) {
        Object.entries(params).forEach(([paramName, type]) => {
            const paramValue = req.params[paramName];
            validationConfigMap[paramName] = { value: paramValue, type };
        });
    }
    if (body) {
        const filesContainer = { file: req.file, files: req.files };

        Object.entries(body).forEach(([fieldName, schema]) => {
            const fieldValue = req.body?.[fieldName];
            validationConfigMap[fieldName] = buildValidationConfig(
                schema,
                fieldValue,
                { fieldName, ...filesContainer }
            );
        });
    }
    if (query) {
        Object.entries(query).forEach(([queryName, schema]) => {
            const rawQueryValue = req.query[queryName];
            const queryValue = rawQueryValue === '' ? undefined : rawQueryValue;
            validationConfigMap[queryName] = buildValidationConfig(schema, queryValue);
        });
    }

    const {
        isValid,
        fieldErrors,
        invalidInputPaths
    } = validateObjectFields<E>(validationConfigMap, entityType);

    // Трансформация сборных значений
    if (isValid) {
        if (body && req.body) {
            transformValues(req.body, body);
        }
        if (query && req.query) {
            transformValues(req.query, query);
        }
        return next();
    }

    // Отправка ответа с ошибками полей
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат полей формы', fieldErrors });
    }
    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: [${invalidPathsStr}]` });
    }

    next();
};

const transformValues = (
    data: Record<string, any>, 
    schema: Record<string, IValidationSchema>
): void => {
    if (!data || typeof data !== 'object') return;

    for (const [key, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            // Объект -> Рекурсивный поиск внутри
            transformValues(data[key], fieldSchema.fields);
        } else {
            // Примитив -> Трансформация значения
            data[key] = transformFieldValue(data[key], fieldSchema.type);
        }
    }
};

const transformFieldValue = (value: unknown, type: TCheckType): any => {
    if (typeof value !== 'string') return value;
    if (value === '') return undefined;

    if (['number', 'integer'].includes(type)) {
        return Number(value);
    }
    
    if (['boolean', 'emptyableBoolean'].includes(type)) {
        if (value === '') return '';
        return value === 'true';
    }

    if (type === 'date') {
        return new Date(value);
    }

    return value;
};
