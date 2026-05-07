import mongoose from 'mongoose';
import { isValidEntityField } from '@server/utils/typeGuards.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import type {
    TCheckType,
    IValidationSchema,
    IValidationConfig,
    TValidationConfigMap
} from '@server/types/index.js';
import type { TEntityType, TValidationRuleType, TFieldErrors, TFilterOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TCheckFn = (val: unknown) => boolean;

type TBaseTypeChecks = Record<TCheckType, TCheckFn>;
type TTypeCheck = TBaseTypeChecks & {
    optional: TBaseTypeChecks;
};

interface IValidationResult<E extends TEntityType = TEntityType> {
    isValid: boolean;
    invalidInputPaths: string[];
    fieldErrors: TFieldErrors<E>;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const BASE_QUERY_VALIDATION_SCHEMA: Record<string, IValidationSchema> = {
    page: { type: 'integer', optional: true },
    limit: { type: 'integer', optional: true },
    sort: { type: 'string', optional: true },
    search: { type: 'string', optional: true },
    timestamp: { type: 'integer', optional: true },
    timeZoneOffset: { type: 'integer', optional: true }
};

const baseTypeChecks: TBaseTypeChecks = {
    string: (val: unknown): val is string => typeof val === 'string',

    float: (val: unknown): val is number => typeof val === 'number' && isFinite(val),

    integer: (val: unknown): val is number => typeof val === 'number' && Number.isInteger(val),

    boolean: (val: unknown): val is boolean => typeof val === 'boolean',

    emptyableBoolean: (val: unknown): val is '' | boolean => val === '' || typeof val === 'boolean',

    date: (val: unknown): val is Date => val instanceof Date && !isNaN(val.getTime()),

    objectId: (val: unknown): val is mongoose.Types.ObjectId => mongoose.Types.ObjectId.isValid(val as any),

    objectIdString: (val: unknown): val is string => mongoose.Types.ObjectId.isValid(val as any),

    array: (val: unknown): val is unknown[] => Array.isArray(val),

    object: (val: unknown): val is Record<string | number, unknown> =>
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val),

    file: (val: unknown): val is Express.Multer.File =>
        typeof val === 'object' &&
        val !== null &&
        'fieldname' in val &&
        'mimetype' in val &&
        'size' in val,
    
    files: (val: unknown): val is Express.Multer.File[] =>
        Array.isArray(val) && val.every(f => typeCheck.file(f))
} as const;

const makeOptionalCheck = (checkFn: TCheckFn): TCheckFn =>
    (val: unknown): boolean => val === undefined || checkFn(val);

const makeTypeCheck = (checks: TBaseTypeChecks): TTypeCheck => {
    const optionalChecks = {} as TBaseTypeChecks;

    (Object.keys(checks) as TCheckType[]).forEach(key => {
        optionalChecks[key] = makeOptionalCheck(checks[key]);
    });

    return {
        ...checks,
        optional: optionalChecks
    };
};

export const typeCheck = makeTypeCheck(baseTypeChecks);

export const validateByType = (
    config: IValidationConfig, 
    entityType?: TEntityType, 
    fieldName?: string
): boolean => {
    const { value, type, optional, nullable, match, min, max, enum: enumValues } = config;
    if (optional && value === undefined) return true;
    if (nullable && value === null) return true;

    const validator = typeCheck[type];
    let isValid = validator?.(value) ?? false;

    // match -> булево значение для поля формы, регулярное выражение - для любого поля
    if (isValid && match) {
        let rule: TValidationRuleType | undefined;

        if (
            typeof match === 'boolean' &&
            entityType &&
            fieldName &&
            isValidEntityField(entityType, fieldName)
        ) {
            rule = validationRules[entityType][fieldName];
        } else if (match instanceof RegExp) {
            rule = match;
        }

        if (rule instanceof RegExp && typeof value === 'string') {
            const trimmedValue = value.trim();
            isValid = rule.test(trimmedValue);
        } else if (typeof rule === 'function') {
            isValid = rule(value);
        }
    }

    // min/max для чисел
    if (isValid && ['number', 'integer'].includes(type) && typeof value === 'number') {
        if (min !== undefined && value < min) isValid = false;
        if (max !== undefined && value > max) isValid = false;
    }

    // enum для примитивов
    if (isValid && enumValues?.length) {
        const isEnumSupported = ['string', 'number', 'integer', 'boolean'].includes(type);
    
        if (isEnumSupported) {
            isValid = enumValues.includes(value as 'string' | 'number' | 'boolean');
        }
    }

    return isValid;
};

export const validateArrayItems = <E extends TEntityType>(
    config: IValidationConfig,
    entityType?: E,
    parentPath: string = ''
): IValidationResult<E> => {
    const { value: arr, items: arrSchema, optional } = config;

    const invalidInputPaths: string[] = [];
    let fieldErrors: TFieldErrors<E> = {};

    if (arr === undefined && optional) {
        return { isValid: true, invalidInputPaths, fieldErrors };
    }
    if (!Array.isArray(arr)) {
        return { isValid: false, invalidInputPaths: parentPath ? [parentPath] : [], fieldErrors };
    }
    if (!arrSchema) {
        return { isValid: false, invalidInputPaths: parentPath ? [parentPath] : [], fieldErrors };
    }
    
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const currentPath = `${parentPath}[${i}]`;

        // Предварительные проверки типа элемента массива для имеющихся подсхем объекта или массива
        if (arrSchema.type === 'object' && arrSchema.fields) {
            if (!typeCheck.object(item)) {
                invalidInputPaths.push(currentPath);
                continue;
            }
        }
        if (arrSchema.type === 'array' && arrSchema.items) {
            if (!typeCheck.array(item)) {
                invalidInputPaths.push(currentPath);
                continue;
            }
        }

        // Создание заполненного значениями конфига элемента массива с его потомками и валидация
        const itemConfig = buildValidationConfig(arrSchema, item);

        // OBJECT + fields
        if (itemConfig.type === 'object' && itemConfig.fields) {
            const result = validateObjectFields<E>(itemConfig.fields, entityType, currentPath);

            invalidInputPaths.push(...result.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...result.fieldErrors };
            continue;
        }

        // ARRAY + items
        if (itemConfig.type === 'array' && itemConfig.items) {
            const result = validateArrayItems<E>(itemConfig, entityType, currentPath);

            invalidInputPaths.push(...result.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...result.fieldErrors };
            continue;
        }

        // BY TYPE
        const isValid = validateByType(itemConfig);
        if (!isValid) invalidInputPaths.push(currentPath);
    }

    return {
        isValid: !invalidInputPaths.length && !Object.keys(fieldErrors).length,
        invalidInputPaths,
        fieldErrors
    };
};

export const validateObjectFields = <E extends TEntityType>(
    configMap: TValidationConfigMap<E>,
    entityType?: E,
    pathPrefix: string = ''
): IValidationResult<E> => {
    const invalidInputPaths: string[] = [];
    let fieldErrors: TFieldErrors<E> = {};
    let isValid = true;

    for (const [fieldName, config] of Object.entries(configMap) as [string, IValidationConfig][]) {
        const { value, type, fields, items, optional, formField = false, errorType } = config;
        const fullPath = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;

        let isFieldValid = true;

        // Валидация данных
        if (type === 'object' && fields) { // OBJECT
            if (value === undefined && optional) continue;

            if (!typeCheck.object(value)) {
                invalidInputPaths.push(fullPath);
                isValid = false;
                continue;
            }

            const result = validateObjectFields<E>(fields, entityType, fullPath);

            if (!result.isValid) {
                invalidInputPaths.push(...result.invalidInputPaths);
                fieldErrors = { ...fieldErrors, ...result.fieldErrors };
                isFieldValid = false;
            }
        } else if (type === 'array' && items) { // ARRAY
            if (value === undefined && optional) continue;

            if (!typeCheck.array(value)) {
                invalidInputPaths.push(fullPath);
                isValid = false;
                continue;
            }

            const result = validateArrayItems(config, entityType, fullPath);

            if (!result.isValid) {
                invalidInputPaths.push(...result.invalidInputPaths);
                fieldErrors = { ...fieldErrors, ...result.fieldErrors };
                isFieldValid = false;
            }
        } else { // BY TYPE
            if (formField && entityType) {
                isFieldValid = validateByType(config, entityType, fieldName);
            } else {
                isFieldValid = validateByType(config);
            }

            if (!isFieldValid) {
                invalidInputPaths.push(fullPath);
            }
        }

        if (!isFieldValid) {
            isValid = false;

            // Заполнение ошибок валидации полей формы
            if (formField && entityType && isValidEntityField(entityType, fieldName)) {
                const errorMessageTypes = fieldErrorMessages[entityType][fieldName];

                fieldErrors[fieldName] =
                    (errorType && errorMessageTypes?.[errorType]) ||
                    errorMessageTypes?.mismatch ||
                    errorMessageTypes?.default ||
                    DEFAULT_FIELD_ERROR_MESSAGE;
            }
        }
    }

    return { isValid, invalidInputPaths, fieldErrors };
};

// Рекурсивное заполнение валидационных схем инпут-значениями от клиента
export const buildValidationConfig = (
    schema: IValidationSchema,
    value: unknown
): IValidationConfig => {
    const { type, fields, ...restSchema } = schema;

    const config: IValidationConfig = {
        type,
        ...restSchema,
        value
    };

    if (type === 'object' && fields && value && typeof value === 'object') {
        config.fields = Object.fromEntries(
            Object.entries(fields).map(([key, fieldSchema]) => [
                key,
                buildValidationConfig(
                    fieldSchema,
                    (value as Record<string, unknown>)[key]
                )
            ])
        );
    }

    return config;
};

// Функция автозаполнения схемы валидации query
export const buildQueryValidationSchema = (
    filterOptions: readonly TFilterOption[] = []
): Record<string, IValidationSchema> => {
    const querySchema: Record<string, IValidationSchema> = { ...BASE_QUERY_VALIDATION_SCHEMA };

    filterOptions.forEach(option => {
        switch (option.type) {
            case 'number':
                querySchema[option.minParamName] = { type: 'float', optional: true };
                querySchema[option.maxParamName] = { type: 'float', optional: true };
                break;

            case 'date':
                querySchema[option.minParamName] = { type: 'date', optional: true };
                querySchema[option.maxParamName] = { type: 'date', optional: true };
                break;

            case 'boolean':
                querySchema[option.paramName] = { type: 'boolean', optional: true };
                break;

            case 'string':
                querySchema[option.paramName] = { type: 'string', optional: true };
                break;
        }
    });

    return querySchema;
};
