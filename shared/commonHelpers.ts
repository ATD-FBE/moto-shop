import { DISCOUNT_SOURCE, CURRENCY_EPS } from './constants.js';
import type { IAppliedDiscount, IDotNotationPatch }  from './types/index.js';

export const toError = (err: unknown): Error => {
    if (err instanceof Error) return err;

    let message: string;
    
    if (err && typeof err === 'object') {
        try {
            message = (err as any).message || JSON.stringify(err);
        } catch {
            message = "[Circular or Unformattable Object]";
        }
    } else {
        message = String(err);
    }

    return new Error(message);
};

export const padTwoDigits = (n: number): string => String(n).padStart(2, '0');

export const formatDateToLocalString = (date: Date): string =>
    `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;

export const formatDateToMoscowLog = (date: Date): string => {
    const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));

    const year = moscowDate.getFullYear();
    const month = padTwoDigits(moscowDate.getMonth() + 1);
    const day = padTwoDigits(moscowDate.getDate());
    const hours = padTwoDigits(moscowDate.getHours());
    const minutes = padTwoDigits(moscowDate.getMinutes());
    const seconds = padTwoDigits(moscowDate.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} MSK`;
};

export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ensureArray = <T>(val: T | T[] | undefined): T[] => {
    if (val === undefined) return [];
    return Array.isArray(val) ? val : [val];
};

export const trimSetByFilter = (
    originalSet: Set<string>,
    allowedSet: Set<string>
): [Set<string>, boolean] => {
    const trimmedSet = new Set(originalSet);
    let changed = false;

    for (const item of trimmedSet) {
        if (!allowedSet.has(item)) {
            trimmedSet.delete(item);
            changed = true;
        }
    }

    return [trimmedSet, changed];
};

// Формирование данных по скидке
export const getAppliedDiscountData = (
    productDiscount: number,
    customerDiscount: number
): IAppliedDiscount => {
    const effectiveDiscount = Math.max(productDiscount, customerDiscount);
    const discountSource = !effectiveDiscount
        ? DISCOUNT_SOURCE.NONE
        : productDiscount > customerDiscount ? DISCOUNT_SOURCE.PRODUCT : DISCOUNT_SOURCE.CUSTOMER;
        
    return {
        appliedDiscount: effectiveDiscount,
        appliedDiscountSource: discountSource
    };
};

export const isEqualCurrency = (a: number, b: number, eps: number = CURRENCY_EPS): boolean =>
    Math.abs(a - b) < eps;

export const applyDotNotationPatches = <T extends Record<string, any>>(
    obj: T, 
    patches: IDotNotationPatch[]
): void => {
    const arraysToCleanup: Set<any[]> = new Set();

    patches.forEach(({ path, value }) => {
        const parts: (string | number)[] = [];

        path.split('.').forEach(part => {
            // RegExp: (ключ объекта или массив)([(индекс массива, если есть)])
            const match = part.match(/([^\[]+)(\[(\d+)\])?/);

            if (match) {
                const key = match[1]; // match[1] - ключ объекта или массив (не начинается с "[")
                parts.push(key);

                if (match[3] !== undefined) { // match[2] - ([...]), match[3] - индекс массива
                    parts.push(Number(match[3]));
                }
            }
        });

        let current: any = obj;

        for (let i = 0; i < parts.length; i++) {
            const isLast = i === parts.length - 1;
            const key = parts[i];

            if (isLast) {
                if (value === undefined) {
                    if (Array.isArray(current) && typeof key === 'number') {
                        current[key] = undefined; // Удаление элемента массива
                        arraysToCleanup.add(current);
                    } else {
                        delete current[key]; // Удаление ключа объекта
                    }
                } else {
                    current[key] = value;
                }
            } else {
                const nextKey = parts[i + 1];

                if (typeof nextKey === 'number') {
                    if (!Array.isArray(current[key])) {
                        current[key] = []; // Создание пустого массива, если отсутствует
                    }
                } else {
                    if (typeof current[key] !== 'object' || current[key] === null) {
                        current[key] = {}; // Создание пустого объекта, если отсутствует
                    }
                }

                current = current[key]; // Следующий элемент вложения в объект или массив
            }
        }
    });

    // Очистка массивов от удалённых (undefined) элементов
    arraysToCleanup.forEach(arr => {
        const filteredArray = arr.filter((item: any): boolean => item !== undefined);
        arr.length = 0; // Очистка оригинального массива
        arr.push(...filteredArray); // Заполнение массива отфильторванными элементами
    });
};

export const getLastFinancialsEventEntry = <T extends { voided?: { flag: boolean } | null }>(
    history: T[]
): T | null => {
    for (let i = history.length - 1; i >= 0; i--) {
        if (!history[i].voided?.flag) {
            return history[i];
        }
    }

    return null; // Для удаления из истории на странице всех заказов
};

export const makeOrderItemQuantityFieldName = (productId: string): string =>
    `item-${productId}-quantity`;

export const getCustomerOrderDetailsPath = (orderNumber: string, orderId: string): string =>
    `/customer/orders/${orderNumber ?? ''}~${orderId}`;
