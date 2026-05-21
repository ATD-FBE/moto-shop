import { typeCheck } from '@server/validation/validationEngine.js';
import type { IOrderDataChange } from '@shared/types/index.js';

export const isArrayContentDifferent = (
    arr1: unknown[],
    arr2: unknown[],
    { orderMatters = false }: { orderMatters?: boolean } = {}
): boolean => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return true;
    if (arr1.length !== arr2.length) return true;

    // Проверка элементов массивов, если порядок важен
    if (orderMatters) {
        return arr1.some((item, idx) => item !== arr2[idx]);
    }

    // Проверка элементов массивов, если порядок не важен
    const itemCounts = new Map<unknown, number>();
    
    for (const item of arr1) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }
    
    for (const item of arr2) {
        const count = itemCounts.get(item);
        if (!count) return true; // Элемента нет или их меньше, чем в arr1
        itemCounts.set(item, count - 1);
    }

    return false;
};

export const isDateLike = (val: unknown): val is string | Date => {
    if (val == null) return false;
    if (val instanceof Date) return true;
    if (typeof val !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}/.test(val) && !isNaN(Date.parse(val)); // Проверка, что строка — ISO-дата
};

export const isDbDataModified = (
    oldData: unknown,
    newData: unknown,
    { preserveNull = false }: { preserveNull?: boolean } = {}
): boolean => {
    // Если null в новом значении удаляет поле (preserveNull = false), то его будущее значение undefined
    // preserveNull интерпретирует новое значение null как валидное (соответствует БД)
    if (oldData === undefined && newData === undefined) return false; // Ничего не было и не стало
    if (oldData === undefined && newData === null) return preserveNull; // null сохраняется или удаляет поле
    if (oldData === null && newData === null) return !preserveNull; // null удаляет поле — это изменение
    if (oldData === null && newData === undefined) return true; // null -> undefined = удаление

    // Одно из значений дата => сравнение дат
    const oldIsDate = isDateLike(oldData);
    const newIsDate = isDateLike(newData);

    if (oldIsDate || newIsDate) {
        if (!oldIsDate || !newIsDate) return true;

        const oldTime = new Date(oldData).getTime();
        const newTime = new Date(newData).getTime();

        if (isNaN(oldTime) || isNaN(newTime)) return true;
        return oldTime !== newTime;
    }

    // Одно из значений массив => глубокое сравнение массивов
    if (Array.isArray(oldData) || Array.isArray(newData)) {
        if (!Array.isArray(oldData) || !Array.isArray(newData)) return true;
        if (oldData.length !== newData.length) return true;
        return oldData.some((item, idx) => isDbDataModified(item, newData[idx], { preserveNull }));
    }

    const oldIsObj = typeCheck.object(oldData);
    const newIsObj = typeCheck.object(newData);

    // Одно из значений примитив, второе - объект
    if (!oldIsObj && newIsObj) {
        // Старое значение undefined, а новое — объект => рекурсивная проверка свойств объекта
        // Mongoose удаляет пустые объекты => undefined === пустой объект => false (нет отличий)
        return oldData === undefined
            ? Object.values(newData).some(val => isDbDataModified(undefined, val, { preserveNull }))
            : true;
    }
    if (!newIsObj && oldIsObj) return true;

    // Оба значения объекты => рекурсивное сравнение по совмещённым ключам
    if (oldIsObj && newIsObj) {
        const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
        for (const key of keys) {
            if (isDbDataModified(oldData[key], newData[key], { preserveNull })) {
                return true;
            }
        }
        return false;
    }

    // Оба значения примитивы => сравнение напрямую
    return oldData !== newData;
};

export const collectDbChanges = (
    oldData: unknown,
    newData: unknown,
    path: string = '',
    fieldsPreserveNull: string[] = [],
    currencyFields: string[] = [],
    changes: IOrderDataChange[] = []
) => {
    const oldIsObj = typeCheck.object(oldData);
    const newIsObj = typeCheck.object(newData);

    // Старые данные листовые, новые — объект => рекурсивный сбор изменений по свойствам нового объекта
    if (!oldIsObj && newIsObj) {
        for (const [key, val] of Object.entries(newData)) {
            collectDbChanges(
                undefined,
                val,
                path ? `${path}.${key}` : key,
                fieldsPreserveNull,
                currencyFields,
                changes
            );
        }

        return changes;
    }

    // Старые данные объект, новые — листовые => рекурсивный сбор изменений по свойствам старого объекта
    if (!newIsObj && oldIsObj) {
        for (const [key, val] of Object.entries(oldData)) {
            collectDbChanges(
                val,
                undefined,
                path ? `${path}.${key}` : key,
                fieldsPreserveNull,
                currencyFields,
                changes
            );
        }

        return changes;
    }

    // Оба значения объекты => рекурсивное сравнение их свойств
    if (oldIsObj && newIsObj) {
        const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

        for (const key of keys) {
            collectDbChanges(
                oldData[key],
                newData[key],
                path ? `${path}.${key}` : key,
                fieldsPreserveNull,
                currencyFields,
                changes
            );
        }
        return changes;
    }
    
    // Оба значения листовые (не объекты) и отличаются => заполнение массива изменений
    const preserveNull = fieldsPreserveNull.includes(path);
    const isCurrency = currencyFields.includes(path);

    if (isDbDataModified(oldData, newData, { preserveNull })) {
        changes.push({
            field: path,
            oldValue: oldData,
            newValue: preserveNull ? newData : newData ?? undefined, // Сохранять или нет значение null
            ...(isCurrency && { currency: true })
        });
    }
    return changes;
};
