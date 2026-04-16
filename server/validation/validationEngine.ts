import mongoose from 'mongoose';
import { isValidEntityField } from '@server/utils/typeGuards.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import type {
    TBaseCheckType,
    IValidationSchema,
    IValidationConfig,
    TValidationConfigMap
} from '@server/types/index.js';
import type { TEntityType, TFieldErrors } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export type TCheckFn = (val: unknown) => boolean;

export type TBaseTypeChecks = Record<TBaseCheckType, TCheckFn>;
export type TTypeCheck = TBaseTypeChecks & {
    optional: TBaseTypeChecks;
};

export interface IValidationResult<E extends TEntityType = TEntityType> {
    isValid: boolean;
    invalidInputPaths: string[];
    fieldErrors: TFieldErrors<E>;
}
export type IValidateArrayOfResult<E extends TEntityType = TEntityType> = IValidationResult<E>;
export type IValidateInputDataResult<E extends TEntityType = TEntityType> = IValidationResult<E>;

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

    array: (val: unknown): val is unknown[] => Array.isArray(val),

    object: (val: unknown): val is Record<string | number, unknown> =>
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val),

    date: (val: unknown): val is Date =>
        (typeof val === 'string' || val instanceof Date) &&
        !isNaN(new Date(val).getTime()),

    objectId: (val: unknown): val is string | mongoose.Types.ObjectId =>
        mongoose.Types.ObjectId.isValid(val as any),

    nullableObjectId: (val: unknown): val is null | string | mongoose.Types.ObjectId =>
        val === null || mongoose.Types.ObjectId.isValid(val as any)
} as const;

const makeOptionalCheck = (checkFn: TCheckFn): TCheckFn =>
    (val: unknown): boolean => val === undefined || checkFn(val);

const makeTypeCheck = (checks: TBaseTypeChecks): TTypeCheck => {
    const optionalChecks = {} as TBaseTypeChecks;

    (Object.keys(checks) as TBaseCheckType[]).forEach(key => {
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
    if (type === 'arrayOf') return false; // arrayOf проверен ДО валидации примитивов

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

    // enum
    if (isValid && enumValues?.length) {
        const normalizedValue = type === 'number' ? Number(value) : value;
        isValid = enumValues.includes(normalizedValue);
    }

    return isValid;
};

export const validateArrayOf = <E extends TEntityType>(
    config: IValidationConfig,
    entityType?: E,
    parentPath: string = ''
): IValidateArrayOfResult<E> => {
    const { value, optional, arrElemConfig } = config;

    const invalidInputPaths: string[] = [];
    let fieldErrors: TFieldErrors<E> = {};

    if (value === undefined && optional) {
        return { isValid: true, invalidInputPaths, fieldErrors };
    }
    if (!Array.isArray(value)) {
        return { isValid: false, invalidInputPaths: parentPath ? [parentPath] : [], fieldErrors };
    }
    if (!arrElemConfig) {
        return { isValid: false, invalidInputPaths: parentPath ? [parentPath] : [], fieldErrors };
    }

    const arr = value as unknown[];

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const currentPath = `${parentPath}[${i}]`;

        // OBJECT
        if (arrElemConfig.type === 'object' && arrElemConfig.fieldConfigs) {
            if (!typeCheck.object(item)) {
                invalidInputPaths.push(currentPath);
                continue;
            }

            const nestedConfigMap: Record<string, IValidationConfig> = Object.fromEntries(
                Object.entries(arrElemConfig.fieldConfigs).map(([key, cfg]) => [
                    key,
                    buildValidationConfig(cfg, (item as any)?.[key])
                ])
            );

            const validationResult = validateInputData<E>(nestedConfigMap, entityType, currentPath);

            invalidInputPaths.push(...validationResult.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...validationResult.fieldErrors };
            continue;
        }

        // ARRAY (nested)
        if (arrElemConfig.type === 'arrayOf') {
            const fullConfig = buildValidationConfig(arrElemConfig, item);
            const validationResult = validateArrayOf<E>(fullConfig, entityType, currentPath);

            invalidInputPaths.push(...validationResult.invalidInputPaths);
            fieldErrors = { ...fieldErrors, ...validationResult.fieldErrors };
            continue;
        }

        // BY TYPE
        const fullConfig = buildValidationConfig(arrElemConfig, item);
        const isValid = validateByType(fullConfig);

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

export const validateInputData = <E extends TEntityType>(
    validationConfigMap: TValidationConfigMap<E>,
    entityType?: E,
    pathPrefix: string = ''
): IValidateInputDataResult<E> => {
    const invalidInputPaths: string[] = [];
    let fieldErrors: TFieldErrors<E> = {};
    let isValid = true;

    for (const [fieldName, config] of Object.entries(validationConfigMap) as [string, IValidationConfig][]) {
        const { value, type, fieldConfigs, form = false } = config;
        const fullPath = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;

        let isFieldValid = true;

        // Валидация данных
        if (type === 'object' && fieldConfigs) { // OBJECT
            if (!typeCheck.object(value)) {
                invalidInputPaths.push(fullPath);
                isValid = false;
                continue;
            }

            const result = validateInputData<E>(fieldConfigs, entityType, fullPath);

            if (!result.isValid) {
                invalidInputPaths.push(...result.invalidInputPaths);
                fieldErrors = { ...fieldErrors, ...result.fieldErrors };
                isFieldValid = false;
            }
        } else if (type === 'arrayOf') { // ARRAY
            const result = validateArrayOf(config, entityType, fullPath);

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
            if (form && entityType && isValidEntityField(entityType, fieldName)) {
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
    const { type, arrElemConfig, fieldConfigs, ...restSchema } = schema;

    const baseConfig: IValidationConfig = {
        type,
        ...restSchema,
        value
    };

    // OBJECT -> В конфиги полей для объекта устанавливается значение для value
    if (type === 'object' && fieldConfigs) {
        baseConfig.fieldConfigs = Object.fromEntries(
            Object.entries(fieldConfigs).map(([key, fieldSchema]) => [
                key,
                buildValidationConfig(
                    fieldSchema,
                    (value as any)?.[key]
                )
            ])
        );
    }

    // ARRAY OF -> В конфиг для элемента массива устанавливается undefined для value
    if (type === 'arrayOf' && arrElemConfig) {
        baseConfig.arrElemConfig = buildValidationConfig(arrElemConfig, undefined);
    }

    return baseConfig;
};
