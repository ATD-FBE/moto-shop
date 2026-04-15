import { RequestHandler } from 'express';
import { buildValidationFieldConfig, validateInputData } from '@server/validation/validationEngine.js';
import { getValueByPath } from '@shared/commonHelpers.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type { IValidationInputSchema, IValidationConfig } from '@server/types/index.js';
import type { TEntityType } from '@shared/types/index.js';

export const validateInput = <E extends TEntityType = TEntityType>(
    schema: IValidationInputSchema<E>
): RequestHandler => (req, res, next) => {
    const { entityType, params, body, query } = schema;
    const validationConfigMap: Record<string, IValidationConfig> = {};

    if (params) {
        Object.entries(params).forEach(([paramName, type]) => {
            const paramValue = req.params[paramName];
            validationConfigMap[paramName] = { value: paramValue, type };
        });
    }
    if (body) {
        Object.entries(body).forEach(([path, schema]) => {
            const fieldName = path.split('.').pop()!;
            const fieldValue = getValueByPath(path, req.body);
            validationConfigMap[fieldName] = buildValidationFieldConfig(schema, fieldValue);
        });
    }
    if (query) {
        Object.entries(query).forEach(([queryName, schema]) => {
            const queryValue = req.query[queryName];
            validationConfigMap[queryName] = buildValidationFieldConfig(schema, queryValue);
        });
    }

    const { invalidInputPaths, fieldErrors } = validateInputData<E>(validationConfigMap, entityType);

    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidPathsStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    next();
};
