import mongoose, { type FilterQuery, type PipelineStage } from 'mongoose';
import log from './logger.js';
import { SEARCH_TYPES, DEFAULT_SEARCH_TYPE } from '@server/config/constants.js';
import { escapeRegExp } from '@shared/commonHelpers.js';
import { MAX_DATE_TS } from '@shared/constants.js';
import type { TSearchTypes } from '@server/types/index.js';
import type {
    IFilterQuery,
    TFilterOptionsEntry,
    ISortOptionsEntry,
    IParseSortResult,
    IPageLimitQuery,
    TPageLimitOptionsEntry
} from '@shared/types/index.js';
import type { IOrderedFiltersArgs } from '@server/types/index.js';

export const buildSearchMatch = (
    search: unknown,
    allowedSearchFields: string[],
    searchType: TSearchTypes
): FilterQuery<any> => {
    const rawSearch = typeof search === 'string' ? search.trim() : '';
    const searchMatch: FilterQuery<any> = {};

    if (!rawSearch) return searchMatch;

    if (mongoose.Types.ObjectId.isValid(rawSearch)) {
        searchMatch._id = mongoose.Types.ObjectId.createFromHexString(rawSearch);
        return searchMatch;
    }

    switch (searchType) {
        case SEARCH_TYPES.REGEX: // Поиск с регулярным выражением (перебор всех документов)
            const safeSearch = escapeRegExp(rawSearch);
            searchMatch.$or = allowedSearchFields.map(field => ({
                [field]: { $regex: safeSearch, $options: 'i' }
            }));
            break;

        case SEARCH_TYPES.TEXT: // Индексированный текстовый поиск (по хотя бы одному слову целиком)
            searchMatch.$text = { $search: rawSearch };
            break;

        default:
            log.warn(`Неверный тип поиска: ${searchType}`);
    }

    return searchMatch;
};

export const buildFilterMatch = (
    query: IFilterQuery,
    filterOptions: TFilterOptionsEntry[]
): FilterQuery<any> => {
    // Смещение времени в минутах
    const timeZoneOffset = parseInt(query.timeZoneOffset ?? '0', 10) || 0;

    // Сборка фильтра
    const filterMatch: FilterQuery<any> = {};

    filterOptions.forEach((option: TFilterOptionsEntry): void => {
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
                    filterMatch[dbField] = { $gte: minValueNum };
                }

                if (!isNaN(maxValueNum) && maxValueNum < maxLimitNum) {
                    filterMatch[dbField] = { ...filterMatch[dbField], $lte: maxValueNum };
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
                        filterMatch[dbField] = { $gte: minDate };
                    }
                }

                if (!isNaN(maxDate.getTime())) {
                    maxDate.setUTCHours(23, 59, 59, 999); // Установка конца дня для даты
                    maxDate.setMinutes(maxDate.getMinutes() + timeZoneOffset); // Смещение времени даты

                    if (maxDate < maxLimitDateUTC) {
                        filterMatch[dbField] = { ...(filterMatch[dbField] ?? {}), $lte: maxDate };
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
                    filterMatch[dbField] = true;
                } else if (value === 'false') {
                    filterMatch[dbField] = { $ne: true };
                } else if (value !== '') {
                    if (defaultValue === 'true') {
                        filterMatch[dbField] = true;
                    } else if (defaultValue === 'false') {
                        filterMatch[dbField] = { $ne: true };
                    }
                }

                break;
            }

            case 'string': {
                const { paramName, defaultValue, valueOptions } = option;

                const value = query[paramName] ?? '';
                const valueOption = valueOptions.find(opt => opt.value === value);

                if (valueOption?.matches) {
                    filterMatch[dbField] = { $in: valueOption.matches };
                } else if (valueOption?.value) {
                    filterMatch[dbField] = valueOption.value;
                } else if (defaultValue) {
                    filterMatch[dbField] = defaultValue;
                }

                break;
            }

            default:
                log.warn(`Неизвестный тип поля для фильтрации: ${type}`);
        }
    });

    return filterMatch;
};

export const parseSortParam = (
    sortParam: unknown,
    sortOptions: ISortOptionsEntry[]
): IParseSortResult => {
    if (!sortOptions.length) {
        return { sortField: 'createdAt', sortOrder: -1 };
    }
    
    const defaultOption = sortOptions[0];
    const defaultSortField = defaultOption.dbField;
    const defaultSortOrder = defaultOption.defaultOrder === 'asc' ? 1 : -1;

    const rawSort = typeof sortParam === 'string' ? sortParam.trim() : '';
    if (!rawSort) return { sortField: defaultSortField, sortOrder: defaultSortOrder };

    const isDescending = rawSort.startsWith('-');
    const sortOrder = isDescending ? -1 : 1;
    const sortFieldCandidate = isDescending ? rawSort.slice(1) : rawSort;

    const allowedSortFields = sortOptions.map(opt => opt.dbField);
    const isAllowed = allowedSortFields.includes(sortFieldCandidate);

    return {
        sortField: isAllowed ? sortFieldCandidate : defaultSortField,
        sortOrder: isAllowed ? sortOrder : defaultSortOrder
    };
};

export const buildSortPipeline = (
    sortField: string,
    sortOrder: 1 | -1,
    sortOptions: ISortOptionsEntry[]
): PipelineStage[] => {
    const pipeline: PipelineStage[] = [];

    // Определение того, нужно ли сортировать с учётом регистра
    const isCaseInsensitiveSortField = sortOptions.some(
        opt => opt.dbField === sortField && opt.caseInsensitive
    );

    if (isCaseInsensitiveSortField) {
        pipeline.push({ // Создание поля для приведения к нижнему регистру
            $addFields: { loweredSortField: { $toLower: `$${sortField}` } }
        });
        pipeline.push({ $sort: { loweredSortField: sortOrder } }); // Сортировка (1 — ASC, -1 — DESC)
    } else {
        pipeline.push({ $sort: { [sortField]: sortOrder } }); // Сортировка (1 — ASC, -1 — DESC)
    }

    return pipeline;
};

export const buildPaginatedPipeline = (
    query: IPageLimitQuery,
    sortOptions: ISortOptionsEntry[],
    pageLimitOptions: TPageLimitOptionsEntry[]
): PipelineStage[] => {
    // Настройка сортировки
    const { sortField, sortOrder }: IParseSortResult = parseSortParam(query.sort, sortOptions);
    const pipeline: PipelineStage[] = buildSortPipeline(sortField, sortOrder, sortOptions);

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
