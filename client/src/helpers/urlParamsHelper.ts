import { formatDateOnly } from '@shared/commonHelpers.js';
import { BOOL_FILTER_VALUES } from '@shared/constants.js';
import type {
    TFilterParamsClient,
    TFilterOption,
    IStringFilterValueOption,
    ISortOption,
    TCategoryMap
} from "@shared/types/index.js";

export const getInitFilterParams = (
    searchParams: URLSearchParams | null | undefined,
    filterOptions: readonly TFilterOption[]
): TFilterParamsClient => {
    const initFilterParams: TFilterParamsClient = {};

    const getValidValue = (
        type: 'number' | 'date' | 'boolean' | 'string',
        param: string,
        fallback?: string | number | Date,
        valueOptions?: IStringFilterValueOption[]
    ): string => {
        const normalizeFallback = type === 'date' ? formatDateOnly(fallback) : String(fallback ?? '');

        const value = searchParams?.get(param);
        if (value == null) return normalizeFallback;
    
        switch (type) {
            case 'number':
                const parsedInt = parseInt(value, 10);
                return isNaN(parsedInt) ? normalizeFallback : String(parsedInt);
            case 'date':
                const parsedDate = new Date(value);
                return isNaN(parsedDate.getTime()) ? normalizeFallback : formatDateOnly(parsedDate);
            case 'boolean':
                return BOOL_FILTER_VALUES.some(v => v === value) ? value : '';
            case 'string':
                return valueOptions?.some(opt => opt.value === value) ? value : normalizeFallback;
            default:
                return value;
        }
    };

    filterOptions.forEach(option => {
        const { type } = option;

        switch (type) {
            case 'number':
            case 'date': {
                const { minParamName, maxParamName, minLimit, maxLimit } = option;

                const minValue = getValidValue(type, minParamName, minLimit);
                initFilterParams[minParamName] = minValue;

                const maxValue = getValidValue(type, maxParamName, maxLimit);
                initFilterParams[maxParamName] = maxValue;

                break;
            }
                
            case 'boolean': {
                const { paramName } = option;

                const value = getValidValue(type, paramName);
                initFilterParams[paramName] = value;

                break;
            }

            case 'string': {
                const { paramName, defaultValue, valueOptions } = option;

                const value = getValidValue(type, paramName, defaultValue, valueOptions);
                initFilterParams[paramName] = value;

                break;
            }
        }
    });

    return initFilterParams;
};

export const getInitSortParam = (
    searchParams: URLSearchParams | null | undefined,
    sortOptions: readonly ISortOption[]
): string => {
    const rawSort = searchParams?.get('sort');
    const isValidSort =
        typeof rawSort === 'string' &&
        sortOptions.some(opt => rawSort === opt.dbField || rawSort === `-${opt.dbField}`);

    if (isValidSort) return rawSort;

    const defaultOption = sortOptions[0];
    const defaultField = defaultOption?.dbField ?? '';
    const defaultOrder = defaultOption?.defaultOrder || 'asc';

    return defaultOrder === 'desc' ? `-${defaultField}` : defaultField;
};

export const getInitPageParam = (searchParams: URLSearchParams | null | undefined): number => {
    const rawPage = searchParams?.get('page');
    return Math.max(parseInt(rawPage ?? '1', 10), 1);
};

export const getInitLimitParam = (
    searchParams: URLSearchParams | null | undefined,
    pageLimitOptions: readonly number[]
) => {
    const defaultPageLimit = pageLimitOptions[0] || 10;
    const maxPagelimit = pageLimitOptions.at(-1) || defaultPageLimit;

    const rawLimit = searchParams?.get('limit');
    return Math.min(Math.max(parseInt(rawLimit ?? String(defaultPageLimit), 10), 1), maxPagelimit);
};

export const getInitCategoryParams = (
    searchParams: URLSearchParams | null | undefined,
    categoryMap: TCategoryMap
): string => {
    const rawCategory = searchParams?.get('category')?.split('~').pop();
    return rawCategory && rawCategory in categoryMap ? rawCategory : '';
};
