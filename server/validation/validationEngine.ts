import mongoose from 'mongoose';
import { isValidEntityField } from '@server/utils/typeGuards.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
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
        !Array.isArray(val)
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
    config: IValidationConfig
): boolean => {
    const { value, type, optional, min, max, enumValues } = config;

    const validator = optional
        ? typeCheck.optional[type]
        : typeCheck[type];

    let isValid = validator?.(value) ?? false;

    // min/max для чисел
    if (isValid && (type === 'number' || type === 'integer')) {
        const num = Number(value);
        if (min !== undefined && num < min) isValid = false;
        if (max !== undefined && num > max) isValid = false;
    }

    // enumValues
    if (isValid && enumValues?.length) {
        const normalizedValue = type === 'number' ? Number(value) : value;
        isValid = enumValues.includes(normalizedValue);
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

        // OBJECT
        if (itemConfig.type === 'object' && itemConfig.fields) {
            const result = validateObjectFields<E>(itemConfig.fields, entityType, currentPath);

            invalidInputPaths.push(...result.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...result.fieldErrors };
            continue;
        }

        // ARRAY (nested)
        if (itemConfig.type === 'array' && itemConfig.items) {
            const result = validateArrayItems<E>(itemConfig, entityType, currentPath);

            invalidInputPaths.push(...result.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...result.fieldErrors };
            continue;
        }

        // BY TYPE
        const isValid = validateByType(itemConfig);

        if (!isValid) {
            invalidInputPaths.push(currentPath);
        }
    }

    return {
        isValid: !invalidInputPaths.length && !Object.keys(fieldErrors).length,
        invalidInputPaths,
        fieldErrors
    };
};

export const validateObjectFields = <E extends TEntityType>(
    validationConfigMap: TValidationConfigMap<E>,
    entityType?: E,
    pathPrefix: string = ''
): IValidationResult<E> => {
    const invalidInputPaths: string[] = [];
    let fieldErrors: TFieldErrors<E> = {};
    let isValid = true;

    for (const [fieldName, config] of Object.entries(validationConfigMap) as [string, IValidationConfig][]) {
        const { value, type, fields, items, optional, formField = false } = config;
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
            isFieldValid = validateByType(config);

            if (!isFieldValid) {
                invalidInputPaths.push(fullPath);
            }
        }

        if (!isFieldValid) {
            isValid = false;

            // Заполнение ошибок валидации полей формы
            if (formField && entityType && isValidEntityField(entityType, fieldName)) {
                const fieldMessages = fieldErrorMessages[entityType][fieldName];

                fieldErrors[fieldName] =
                    fieldMessages?.mismatch ||
                    fieldMessages?.default ||
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

    const baseConfig: IValidationConfig = {
        type,
        ...restSchema,
        value
    };

    if (type === 'object' && fields) {
        baseConfig.fields = Object.fromEntries(
            Object.entries(fields).map(([key, fieldSchema]) => [
                key,
                buildValidationConfig(
                    fieldSchema,
                    (value as any)?.[key]
                )
            ])
        );
    }

    return baseConfig;
};
