import mongoose from 'mongoose';
import { fieldErrorMessages } from '@shared/fieldRules.js';
import type {
    TCheckType,
    TCheckFn,
    ITypeCheckBase,
    ITypeCheck,
    IInputTypeMap,
    IValidateInputTypesResult
} from '@server/types/index.js';
import type { TEntityType, TFieldErrorMessages } from '@shared/types/index.js';

export const baseTypeChecks: ITypeCheckBase = {
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

    arrayOf: (arr: unknown, elemType?: TCheckType, check?: ITypeCheck): boolean => {
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

const makeTypeCheck = (checks: ITypeCheckBase): ITypeCheck => {
    const optionalChecks = {} as ITypeCheckBase;

    (Object.keys(checks) as TCheckType[]).forEach(key => {
        optionalChecks[key] = makeOptionalCheck(checks[key]);
    });

    return {
        ...checks,
        optional: optionalChecks
    };
};

export const typeCheck = makeTypeCheck(baseTypeChecks);

export const validateInputTypes = (
    inputTypeMap: IInputTypeMap,
    entityType?: TEntityType
): IValidateInputTypesResult => {
    const invalidInputKeys: string[] = [];
    const fieldErrors: Record<string, string> = {};

    for (const [key, config] of Object.entries(inputTypeMap)) {
        const { value, type, elemType, optional, form = false } = config;

        const validator = optional ? typeCheck.optional[type] : typeCheck[type];
        const isValid = type === 'arrayOf'
            ? validator?.(value, elemType, typeCheck) ?? false
            : validator?.(value) ?? false;
        if (isValid) continue;

        if (form && entityType) {
            fieldErrors[key] =
                fieldErrorMessages[entityType]?.[key]?.mismatch ||
                fieldErrorMessages[entityType]?.[key]?.default ||
                fieldErrorMessages.DEFAULT;
        } else {
            invalidInputKeys.push(key);
        }
    }

    return { invalidInputKeys, fieldErrors };
};
