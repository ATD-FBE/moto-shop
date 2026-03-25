export const isObject = (val: unknown): val is Record<string, unknown> =>
    typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date);

export const normalizeInputDataToNull = (data: unknown): unknown => {
    if (data == null) return null;
    if (typeof data === 'string') return data.trim() || null;
    if (data instanceof Date) return new Date(data);
    if (Array.isArray(data)) return data.map(normalizeInputDataToNull);

    if (isObject(data)) {
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
        let target: any = result;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];

            if (typeof target[part] !== 'object' || target[part] === null) {
                target[part] = {};
            }
            
            target = target[part];
        }

        const lastKey = parts[parts.length - 1];
        target[lastKey] = value;
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
    const t = target as Record<string, any>;
    const s = source as Record<string, any>;

    const keys = new Set([...Object.keys(target), ...Object.keys(source)]);
    const resultObj: Record<string, unknown> = {};

    for (const key of keys) {
        const tVal = t[key];
        const sVal = s[key];

        if (isObject(sVal)) {
            resultObj[key] = deepMergeNewNullable(tVal || {}, sVal);
        } else if (sVal !== undefined) {
            resultObj[key] = sVal;
        } else if (tVal !== undefined) {
            resultObj[key] = tVal;
        }
    }

    return resultObj;
};
