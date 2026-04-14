import mongoose from 'mongoose';
import { isValidEntityField } from '@server/utils/typeGuards.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import type {
    TCheckType,
    TCheckFn,
    TBaseTypeChecks,
    TTypeCheck,
    TInputTypeMap,
    IInputTypeMapConfig,
    IValidateInputTypesResult
} from '@server/types/index.js';
import type { TEntityType, TFieldErrors } from '@shared/types/index.js';

export const baseTypeChecks: TBaseTypeChecks = {
    string: (val: unknown): val is string => typeof val === 'string',

    number: (val: unknown): val is string | number =>
        ['string', 'number'].includes(typeof val) &&
        val !== '' &&
        isFinite(Number(val)),

    boolean: (val: unknown): val is string | boolean =>
        typeof val === 'boolean' ||
        (typeof val === 'string' && (val === 'true' || val === 'false')),

    emptyableBoolean: (val: unknown): val is string | boolean =>
        val === '' ||
        typeof val === 'boolean' ||
        (typeof val === 'string' && (val === 'true' || val === 'false')),

    array: (val: unknown): val is unknown[] => Array.isArray(val),

    arrayOf: (arr: unknown, elemType?: TCheckType, check?: TTypeCheck): boolean => {
        if (!Array.isArray(arr)) return false;
        if (!arr.length) return true;
        if (!elemType) return false;

        const validator = check?.[elemType];
        if (!validator) return false;

        return arr.every(item => validator(item));
    },

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
    (val: unknown, ...args: unknown[]): boolean =>
        val === undefined || checkFn(val, ...args);

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

export const validateInputTypes = <E extends TEntityType>(
    inputTypeMap: TInputTypeMap<E>,
    entityType?: E
): IValidateInputTypesResult<E> => {
    const invalidInputPaths: string[] = [];
    const fieldErrors: TFieldErrors<E> = {};

    for (const [path, config] of Object.entries(inputTypeMap) as [string, IInputTypeMapConfig][]) {
        const { value, type, elemType, optional, form = false, enumValues } = config;

        // Проверка типа значения
        const validator = optional ? typeCheck.optional[type] : typeCheck[type];

        let isValid = type === 'arrayOf'
            ? validator?.(value, elemType, typeCheck) ?? false
            : validator?.(value) ?? false;

        // Проверка значения среди разрешённых
        if (isValid && enumValues && enumValues.length > 0) {
            isValid = enumValues.includes(value);
        }
        
        if (isValid) continue;

        // Сбор данных об ошибке для поля формы или другого ключа
        const fieldName = path.split('.').pop()!;

        if (form && entityType && isValidEntityField(entityType, fieldName)) {
            const fieldMessages = fieldErrorMessages[entityType][fieldName];

            fieldErrors[fieldName] =
                fieldMessages?.mismatch ||
                fieldMessages?.default ||
                DEFAULT_FIELD_ERROR_MESSAGE;
        } else {
            invalidInputPaths.push(path);
        }
    }

    return { invalidInputPaths, fieldErrors };
};
