import { RequestHandler } from 'express';
import { buildValidationConfig, validateObjectFields } from '@server/validation/validationEngine.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type {
    TCheckType,
    IValidationSchema,
    IValidationInputSchema,
    IValidationConfig
} from '@server/types/index.js';
import { ensureArray } from '@shared/commonHelpers.js';
import type { TEntityType } from '@shared/types/index.js';

interface IMulterContext {
    file?: Express.Multer.File; // req.file
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>; // req.files
}

export const validateInput = <E extends TEntityType = TEntityType>(
    schema: IValidationInputSchema<E>
): RequestHandler => (req, res, next) => {
    const { entityType, params, body, query } = schema;
    req.entityType = entityType;

    const filesContainer = { file: req.file, files: req.files };

    const parsedParams: Record<string, any> = {};
    const parsedBody: Record<string, any> = body
        ? parseValues(req.body ?? {}, body, filesContainer)
        : req.body ?? {};
    const parsedQuery: Record<string, any> = query
        ? parseValues(req.query ?? {}, query)
        : req.query ?? {};

    const validationConfigMap: Record<string, IValidationConfig> = {};

    if (params) {
        Object.entries(params).forEach(([paramName, type]) => {
            const paramValue = parseFieldValue(req.params[paramName], type);
            parsedParams[paramName] = paramValue;
            validationConfigMap[paramName] = { value: paramValue, type };
        });
    }
    if (body) {
        Object.entries(body).forEach(([fieldName, schema]) => {
            const fieldValue = parsedBody[fieldName];
            validationConfigMap[fieldName] = buildValidationConfig(schema, fieldValue);
        });
    }
    if (query) {
        Object.entries(query).forEach(([queryName, schema]) => {
            const queryValue = parsedQuery[queryName];
            validationConfigMap[queryName] = buildValidationConfig(schema, queryValue);
        });
    }

    const {
        isValid,
        fieldErrors,
        invalidInputPaths
    } = validateObjectFields<E>(validationConfigMap, entityType);

    // Установка значений, трансформированных при парсинге
    if (isValid) {
        if (params) req.params = parsedParams;
        if (body) req.body = parsedBody;
        if (query) req.query = parsedQuery;
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

const parseValues = (
    data: Record<string, any>,
    schema: Record<string, IValidationSchema>,
    multerContext?: IMulterContext
): Record<string, any> => {
    if (!data || typeof data !== 'object') return {};

    const result: Record<string, any> = {};

    const extractFile = (fieldName: string): Express.Multer.File | undefined => {
        const { file, files } = multerContext || {};
    
        // upload.single (fieldName)
        if (file?.fieldname === fieldName) return file;
    
        // upload.fields([{ name: fieldName, maxCount: 1 }])
        if (files && !Array.isArray(files) && files[fieldName]?.[0]) {
            return files[fieldName][0];
        }
    
        return undefined;
    };

    const extractFiles = (fieldName: string): Express.Multer.File[] => {
        const { files } = multerContext || {};
    
        // upload.array(fieldName)
        if (Array.isArray(files)) {
            return files.length === 0 || files[0]?.fieldname === fieldName
                ? files
                : [];
        }
    
        // upload.fields([{ name: fieldName }])
        if (files && typeof files === 'object') {
            return files[fieldName] ?? [];
        }
    
        return [];
    };

    const parseArray = (arr: any[], itemSchema: IValidationSchema): any[] => {
        return arr.map(item => {
            if (itemSchema.type === 'object' && itemSchema.fields) {
                return parseValues(item, itemSchema.fields, multerContext);
            }

            if (itemSchema.type === 'array' && itemSchema.items && Array.isArray(item)) {
                return parseArray(item, itemSchema.items);
            }

            return parseFieldValue(item, itemSchema.type, itemSchema.nullable);
        });
    };

    for (const [key, fieldSchema] of Object.entries(schema)) {
        const value = data[key];

        // FILE
        if (fieldSchema.type === 'file') {
            result[key] = extractFile(key);
            continue;
        }

        // FILES
        if (fieldSchema.type === 'files') {
            result[key] = extractFiles(key);
            continue;
        }

        // OBJECT
        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            result[key] = parseValues(value, fieldSchema.fields, multerContext);
            continue;
        }

        // ARRAY
        if (fieldSchema.type === 'array' && fieldSchema.items) {
            const arrayValue = ensureArray(value);
            result[key] = parseArray(arrayValue, fieldSchema.items);
            continue;
        }

        // PRIMITIVE
        result[key] = parseFieldValue(value, fieldSchema.type, fieldSchema.nullable);
    }

    return result;
};

const parseFieldValue = (value: unknown, type: TCheckType, nullable?: boolean): unknown => {
    if (typeof value !== 'string') return value;
    if (value === '' && nullable) return null;
    if (value === '' && type !== 'emptyableBoolean') return undefined;
    if (value === 'null' && type !== 'string') return null;

    if (type === 'float') {
        if (!/^[-+]?\d+(\.\d+)?$/.test(value)) return value;
        return Number(value);
    }

    if (type === 'integer') {
        if (!/^[-+]?\d+$/.test(value)) return value;
        return Number(value);
    }

    if (type === 'boolean') {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    }

    if (type === 'emptyableBoolean') {
        if (value === '') return '';
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    }

    if (type === 'date') {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date;
    }
    
    return value;
};
