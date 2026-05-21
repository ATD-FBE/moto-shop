import { typeCheck } from '@server/validation/validationEngine.js';

export const normalizeInputDataToNull = (data: unknown): any => {
    if (data == null) return null;
    if (typeof data === 'string') return data.trim() || null;
    if (data instanceof Date) return new Date(data);
    if (Array.isArray(data)) return data.map(normalizeInputDataToNull);

    if (typeCheck.object(data)) {
        return Object.fromEntries(
            Object.entries(data)
                .filter(([key]) => Object.hasOwn(data, key))
                .map(([key, val]) => [key, normalizeInputDataToNull(val)])
        );
    }
    
    return data;
};

export const dotNotationToObject = (flatObj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(flatObj)) {
        const parts = key.split('.');
        if (parts.some(p => !p)) continue;

        let target = result;

        partsCycle: for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!part) break partsCycle;

            if (!typeCheck.object(target[part])) target[part] = {};
            if (typeCheck.object(target[part])) target = target[part];
        }

        const lastKey = parts.at(-1);
        if (lastKey) target[lastKey] = value;
    }

    return result;
};

export const deepMergeNewNullable = (target: unknown, source: unknown): any => {
    if (target == null || typeof target !== 'object') {
        if (typeof source === 'object' && source !== null) return deepMergeNewNullable({}, source);
        return source;
    }
    if (source == null || typeof source !== 'object') return source;
    if (source instanceof Date) return new Date(source);
    if (Array.isArray(source)) return [...source];

    // target и source - объекты
    const trg = target as Record<string, any>;
    const src = source as Record<string, any>;

    const keys = new Set([...Object.keys(target), ...Object.keys(source)]);
    const resultObj: Record<string, unknown> = {};

    for (const key of keys) {
        const trgVal = trg[key];
        const srcVal = src[key];

        if (typeCheck.object(srcVal)) {
            resultObj[key] = deepMergeNewNullable(trgVal || {}, srcVal);
        } else if (srcVal !== undefined) {
            resultObj[key] = srcVal;
        } else if (trgVal !== undefined) {
            resultObj[key] = trgVal;
        }
    }

    return resultObj;
};
