import { Types, type FilterQuery, type PipelineStage } from 'mongoose';
import log from './logger.js';
import { SEARCH_TYPES, DEFAULT_SEARCH_TYPE } from '@server/config/constants.js';
import { escapeRegExp } from '@shared/commonHelpers.js';
import { MAX_DATE_TS } from '@shared/constants.js';
import type { TSearchTypes } from '@server/types/index.js';
import type {
    ICommonFilterQuery,
    TFilterOption,
    ISortOptionsEntry,
    IParseSortResult,
    IPageLimitQuery,
    TPageLimitOptionsEntry
} from '@shared/types/index.js';
import type { IOrderedFiltersArgs } from '@server/types/index.js';

export const buildSearchMatch = <T>(
    searchParam: unknown,
    allowedSearchFields: (keyof T)[],
    searchType: TSearchTypes
): FilterQuery<T> => {
    const search = typeof searchParam === 'string' ? searchParam.trim() : '';
    const searchMatch: FilterQuery<T> = {};

    if (!search) return searchMatch;

    if (Types.ObjectId.isValid(search)) {
        searchMatch._id = Types.ObjectId.createFromHexString(search);
        return searchMatch;
    }

    switch (searchType) {
        case SEARCH_TYPES.REGEX: // Поиск с регулярным выражением (перебор всех документов)
            const safeSearch = escapeRegExp(search);
            searchMatch.$or = allowedSearchFields.map(field => ({
                [field]: { $regex: safeSearch, $options: 'i' }
            } as FilterQuery<T>));
            break;

        case SEARCH_TYPES.TEXT: // Индексированный текстовый поиск (по хотя бы одному слову целиком)
            searchMatch.$text = { $search: search };
            break;

        default:
            log.warn(`Неверный тип поиска: ${searchType}`);
    }

    return searchMatch;
};

export const buildFilterMatch = <T>(
    query: ICommonFilterQuery,
    filterOptions: TFilterOption<T>[]
): FilterQuery<T> => {
    // Смещение времени в минутах
    const timeZoneOffset = parseInt(query.timeZoneOffset ?? '0', 10) || 0;

    // Сборка фильтра
    const filterMatch: FilterQuery<T> = {};

    filterOptions.forEach(option => {
        const { dbField, type } = option;

        switch (type) {
            case 'number': {
                const { minParamName, maxParamName, minLimit, maxLimit } = option;

                const minValue = query[minParamName] ?? '';
                const maxValue = query[maxParamName] ?? '';
                const minValueNum = minValue !== '' ? Number(minValue) : -Infinity;
                const maxValueNum = maxValue !== '' ? Number(maxValue) : Infinity;
                const minLimitNum = minLimit !== '' ? Number(minLimit) : -Infinity;
                const maxLimitNum = maxLimit !== '' ? Number(maxLimit) : Infinity;

                if (!isNaN(minValueNum) && minValueNum > minLimitNum) {
                    (filterMatch as any)[dbField] = { $gte: minValueNum };
                }

                if (!isNaN(maxValueNum) && maxValueNum < maxLimitNum) {
                    (filterMatch as any)[dbField] = { ...filterMatch[dbField], $lte: maxValueNum };
                }

                if (
                    filterMatch[dbField]?.$gte !== undefined &&
                    filterMatch[dbField]?.$lte !== undefined &&
                    filterMatch[dbField].$gte > filterMatch[dbField].$lte
                ) {
                    delete filterMatch[dbField];
                }

                break;
            }

            case 'date': {
                const { minParamName, maxParamName, minLimitUTC, maxLimitUTC } = option;

                const minDate = new Date(query[minParamName] ?? '');
                const maxDate = new Date(query[maxParamName] ?? '');
                const minLimitDateUTC = minLimitUTC !== '' ? new Date(minLimitUTC) : new Date(-MAX_DATE_TS);
                const maxLimitDateUTC = maxLimitUTC !== '' ? new Date(maxLimitUTC) : new Date(MAX_DATE_TS);

                if (!isNaN(minDate.getTime())) {
                    minDate.setUTCHours(0, 0, 0, 0); // Установка начала дня для даты
                    minDate.setMinutes(minDate.getMinutes() + timeZoneOffset); // Смещение времени даты

                    if (minDate > minLimitDateUTC) {
                        (filterMatch as any)[dbField] = { $gte: minDate };
                    }
                }

                if (!isNaN(maxDate.getTime())) {
                    maxDate.setUTCHours(23, 59, 59, 999); // Установка конца дня для даты
                    maxDate.setMinutes(maxDate.getMinutes() + timeZoneOffset); // Смещение времени даты

                    if (maxDate < maxLimitDateUTC) {
                        (filterMatch as any)[dbField] = { ...(filterMatch[dbField] ?? {}), $lte: maxDate };
                    }
                }

                if (
                    filterMatch[dbField]?.$gte !== undefined &&
                    filterMatch[dbField]?.$lte !== undefined &&
                    filterMatch[dbField].$gte > filterMatch[dbField].$lte
                ) {
                    delete filterMatch[dbField];
                }

                break;
            }

            case 'boolean': {
                const { paramName, defaultValue } = option;

                const value = query[paramName] ?? '';

                if (value === 'true') {
                    (filterMatch as any)[dbField] = true;
                } else if (value === 'false') {
                    (filterMatch as any)[dbField] = { $ne: true };
                } else if (value !== '') {
                    if (defaultValue === 'true') {
                        (filterMatch as any)[dbField] = true;
                    } else if (defaultValue === 'false') {
                        (filterMatch as any)[dbField] = { $ne: true };
                    }
                }

                break;
            }

            case 'string': {
                const { paramName, defaultValue, valueOptions } = option;

                const value = query[paramName] ?? '';
                const valueOption = valueOptions.find(opt => opt.value === value);

                if (valueOption?.matches) {
                    (filterMatch as any)[dbField] = { $in: valueOption.matches };
                } else if (valueOption?.value) {
                    (filterMatch as any)[dbField] = valueOption.value;
                } else if (defaultValue) {
                    (filterMatch as any)[dbField] = defaultValue;
                }

                break;
            }

            default:
                log.warn(`Неизвестный тип поля для фильтрации: ${type}`);
        }
    });

    return filterMatch;
};

export const parseSortParam = <T>(
    sortParam: unknown,
    sortOptions: ISortOptionsEntry<T>[]
): IParseSortResult<T> => {
    const defaultOption = sortOptions[0];
    const defaultSortField = defaultOption.dbField;
    const defaultSortOrder = defaultOption.defaultOrder === 'asc' ? 1 : -1;

    const sort = typeof sortParam === 'string' ? sortParam.trim() : '';
    if (!sort) return { sortField: defaultSortField, sortOrder: defaultSortOrder };

    const isDescending = sort.startsWith('-');
    const sortOrder = isDescending ? -1 : 1;
    
    const sortFieldCandidate = (isDescending ? sort.slice(1) : sort) as keyof T;
    const isAllowed = sortOptions.some(opt => opt.dbField === sortFieldCandidate);

    return {
        sortField: isAllowed ? sortFieldCandidate : defaultSortField,
        sortOrder: isAllowed ? sortOrder : defaultSortOrder
    };
};

export const buildSortPipeline = <T>(
    sortField: keyof T,
    sortOrder: 1 | -1
): PipelineStage[] => [
    { $sort: { [sortField]: sortOrder } }
];

export const buildPaginatedPipeline = <T>(
    query: IPageLimitQuery,
    sortOptions: ISortOptionsEntry<T>[],
    pageLimitOptions: TPageLimitOptionsEntry[]
): PipelineStage[] => {
    // Настройка сортировки
    const { sortField, sortOrder } = parseSortParam<T>(query.sort, sortOptions);
    const pipeline = buildSortPipeline<T>(sortField, sortOrder);

    // Настройка пагинации
    const defaultPageLimit = pageLimitOptions[0] || 10;
    const maxPagelimit = pageLimitOptions.at(-1) || defaultPageLimit;

    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const rawLimit = parseInt(query.limit ?? '', 10) || defaultPageLimit;
    const limit = Math.min(Math.max(rawLimit, 1), maxPagelimit); // Количество выводимых результатов
    const skip = (page - 1) * limit; // Количество пропускаемых результатов до выводимых

    // Формирование пайплайна пагинированных данных
    pipeline.push({ $skip: skip }); // Пагинация - пропуск результатов предыдущих страниц
    pipeline.push({ $limit: limit }); // Пагинация - количество результатов на странице

    return pipeline;
};

export const buildOrderedFiltersPipeline = ({
    computedFields = [],
    searchMatch = {},
    filterMatch = {},
    extraFilters = [],
    searchType = DEFAULT_SEARCH_TYPE
}: IOrderedFiltersArgs): PipelineStage[] => {
    const searchMatchStage: PipelineStage[] = Object.keys(searchMatch).length > 0
        ? [{ $match: searchMatch }]
        : [];
    const filterMatchStage: PipelineStage[] = Object.keys(filterMatch).length > 0
        ? [{ $match: filterMatch }]
        : [];

    const pipeline: PipelineStage[] = [];

    switch (searchType) {
        case SEARCH_TYPES.REGEX: // Поиск с регулярным выражением (перебор всех документов)
            pipeline.push(
                ...computedFields,
                ...extraFilters, // Фильтрация по дополнительным фильтрам (например, categoriesPipeline)
                ...filterMatchStage, // Фильтрация по заданным параметрам
                ...searchMatchStage // Поиск по регулярному выражению
            );
            break;

        case SEARCH_TYPES.TEXT: // Индексированный текстовый поиск (хотя бы одно слово целиком)
            pipeline.push(
                ...computedFields,
                ...searchMatchStage, // Поиск по текстовому значению
                ...extraFilters, // Фильтрация по дополнительным фильтрам (например, categoriesPipeline)
                ...filterMatchStage // Фильтрация по заданным параметрам
            );
            break;

        default:
            log.warn(`Неверный тип поиска: ${searchType}`);
    }

    return pipeline;
};
