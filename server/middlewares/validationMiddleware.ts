import { RequestHandler } from 'express';
import { buildValidationConfig, validateObjectFields } from '@server/validation/validationEngine.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type { IValidationInputSchema, IValidationConfig } from '@server/types/index.js';
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
        Object.entries(body).forEach(([fieldName, schema]) => {
            const fieldValue = req.body?.[fieldName];
            validationConfigMap[fieldName] = buildValidationConfig(schema, fieldValue);
        });
    }
    if (query) {
        Object.entries(query).forEach(([queryName, schema]) => {
            const queryValue = req.query[queryName];
            validationConfigMap[queryName] = buildValidationConfig(schema, queryValue);
        });
    }

    const {
        isValid,
        fieldErrors,
        invalidInputPaths
    } = validateObjectFields<E>(validationConfigMap, entityType);

    if (isValid) return next();

    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат полей формы', fieldErrors });
    }
    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: [${invalidPathsStr}]` });
    }

    next();
};
