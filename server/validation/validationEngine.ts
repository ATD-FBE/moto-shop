import { Request } from 'express';
import mongoose from 'mongoose';
import { isValidEntityField } from '@server/utils/typeGuards.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import type {
    TCheckType,
    IValidationSchema,
    IValidationConfig,
    TValidationConfigMap
} from '@server/types/index.js';
import type { TEntityType, TFieldErrors } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export type TCheckFn = (val: unknown) => boolean;

export type TBaseTypeChecks = Record<TCheckType, TCheckFn>;
export type TTypeCheck = TBaseTypeChecks & {
    optional: TBaseTypeChecks;
};

export interface IValidationResult<E extends TEntityType = TEntityType> {
    isValid: boolean;
    invalidInputPaths: string[];
    fieldErrors: TFieldErrors<E>;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const baseTypeChecks: TBaseTypeChecks = {
    string: (val: unknown): val is string => typeof val === 'string',

    number: (val: unknown): val is string | number =>
        ['string', 'number'].includes(typeof val) &&
        val !== '' &&
        isFinite(Number(val)),

    integer: (val: unknown): val is string | number =>
        ['string', 'number'].includes(typeof val) &&
        val !== '' &&
        Number.isInteger(Number(val)),

    boolean: (val: unknown): val is string | boolean =>
        typeof val === 'boolean' ||
        (typeof val === 'string' && (val === 'true' || val === 'false')),

    emptyableBoolean: (val: unknown): val is string | boolean =>
        val === '' ||
        typeof val === 'boolean' ||
        (typeof val === 'string' && (val === 'true' || val === 'false')),

    date: (val: unknown): val is Date =>
        (typeof val === 'string' || val instanceof Date) &&
        !isNaN(new Date(val).getTime()),

    objectId: (val: unknown): val is string | mongoose.Types.ObjectId =>
        mongoose.Types.ObjectId.isValid(val as any),

    nullableObjectId: (val: unknown): val is null | string | mongoose.Types.ObjectId =>
        val === null || mongoose.Types.ObjectId.isValid(val as any),

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
    const { value, type, optional, match, min, max, enum: enumValues } = config;
    if (optional && value === undefined) return true;

    const validator = typeCheck[type];
    let isValid = validator?.(value) ?? false;

    // match для строки -> булево значение для поля формы, регулярное выражение - для любого поля
    if (isValid && type === 'string' && typeof value === 'string' && match) {
        let rule: RegExp | ((val: string) => boolean) | undefined;

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

        if (rule) {
            const trimmedValue = value.trim();

            if (rule instanceof RegExp) {
                isValid = rule.test(trimmedValue);
            } else if (typeof rule === 'function') {
                isValid = rule(trimmedValue);
            }
        }
    }

    // min/max для чисел
    if (isValid && ['number', 'integer'].includes(type)) {
        const num = Number(value);
        if (min !== undefined && num < min) isValid = false;
        if (max !== undefined && num > max) isValid = false;
    }

    // enum для примитивов
    if (isValid && enumValues?.length) {
        const isEnumSupported = ['string', 'number', 'integer', 'boolean'].includes(type);
    
        if (isEnumSupported) {
            const isNumeric = ['number', 'integer'].includes(type);
            const normalizedValue = isNumeric ? Number(value) : value;

            isValid = enumValues.includes(normalizedValue as any);
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
interface IMulterContext {
    fieldName: string;
    file?: Express.Multer.File; // req.file
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>; // req.files
}

export const buildValidationConfig = (
    schema: IValidationSchema,
    value: unknown,
    multerContext?: IMulterContext
): IValidationConfig => {
    const { type, fields, ...restSchema } = schema;
    let finalValue = value;

    if (multerContext) {
        const { fieldName, file, files } = multerContext;

        if (type === 'file') {
            // Тип конфига multer 'single' -> Файл
            if (file?.fieldname === fieldName) {
                finalValue = file;
            } 
            // Тип конфига multer 'fields' -> Объект с массивом из одного файла по ключу fieldName
            else if (files && !Array.isArray(files) && files[fieldName]?.[0]) {
                finalValue = files[fieldName][0];
            }
        } else if (type === 'files') {
            // Тип конфига multer 'array' -> Массив файлов
            if (Array.isArray(files) && files[0]?.fieldname === fieldName) {
                finalValue = files;
            }
            // Тип конфига multer 'fields' -> Объект с массивами файлов по ключам fieldname
            else if (files && !Array.isArray(files) && files[fieldName]) {
                finalValue = files[fieldName];
            }
        }
    }

    const baseConfig: IValidationConfig = {
        type,
        ...restSchema,
        value: finalValue
    };

    if (type === 'object' && fields) {
        baseConfig.fields = Object.fromEntries(
            Object.entries(fields).map(([key, fieldSchema]) => [
                key,
                buildValidationConfig(
                    fieldSchema, 
                    (value as any)?.[key], 
                    multerContext ? { ...multerContext, fieldName: key } : undefined
                )
            ])
        );
    }

    return baseConfig;
};
