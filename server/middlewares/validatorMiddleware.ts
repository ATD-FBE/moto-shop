import { RequestHandler } from 'express';
import { validateInputTypes } from '@server/utils/typeValidation.js';
import { getValueByPath } from '@shared/commonHelpers.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type { IValidateInputSchema, IInputTypeMapConfig, TInputTypeMap } from '@server/types/index.js';
import type { TEntityType } from '@shared/types/index.js';

export const validateInput = <E extends TEntityType = TEntityType>(
    schema: IValidateInputSchema<E>
): RequestHandler => (req, res, next) => {
    const { entityType, params, body, query } = schema;
    const tempInputTypeMap: Record<string, IInputTypeMapConfig> = {};

    if (params) {
        Object.entries(params).forEach(([paramName, type]) => {
            const paramValue = req.params[paramName];
            tempInputTypeMap[paramName] = { value: paramValue, type };
        });
    }
    if (body) {
        Object.entries(body).forEach(([path, config]) => {
            const fieldName = path.split('.').pop()!;
            const fieldValue = getValueByPath(path, req.body);
            tempInputTypeMap[fieldName] = { ...config, value: fieldValue };
        });
    }
    if (query) {
        Object.entries(query).forEach(([queryName, config]) => {
            const queryValue = req.query[queryName];
            tempInputTypeMap[queryName] = { ...config, value: queryValue };
        });
    }

    const inputTypeMap: TInputTypeMap<E> = tempInputTypeMap;

    const { invalidInputPaths, fieldErrors } = validateInputTypes(inputTypeMap, entityType);

    if (invalidInputPaths.length > 0) {
        const invalidKeysStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    next();
};
