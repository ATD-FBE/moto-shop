import { Types } from 'mongoose';
import log from './logger.js';
import { SEARCH_TYPES, DEFAULT_SEARCH_TYPE } from '@server/config/constants.js';
import { escapeRegExp } from '@shared/commonHelpers.js';
import { MAX_DATE_TS, MAX_TIMEZONE_OFFSET_MINUTES } from '@shared/constants.js';
import type { QueryFilter, PipelineStage, Expression } from 'mongoose';
import type { TSearchTypes } from '@server/types/index.js';
import type {
    TDbField,
    TFilterOption,
    TFilterParamsServer,
    ISortOption,
    TQuery
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IParseSortResult<TModel extends object> {
    sortField: TDbField<TModel>;
    sortOrder: 1 | -1;
}

interface IOrderedFiltersArgs {
    computedFields?: PipelineStage[];
    searchMatch?: QueryFilter<any>;
    filterMatch?: QueryFilter<any>;
    extraFilters?: PipelineStage[];
    searchType?: TSearchTypes;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const buildSearchMatch = <T extends { _id: Types.ObjectId }>(
    searchParam: unknown,
    allowedSearchFields: readonly (keyof T)[],
    searchType: TSearchTypes
): QueryFilter<T> => {
    const search = typeof searchParam === 'string' ? searchParam.trim() : '';
    const searchMatch: QueryFilter<T> & { $text?: { $search: string } } = {};

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
            }));
            break;

        case SEARCH_TYPES.TEXT: // Индексированный текстовый поиск (по хотя бы одному слову целиком)
            searchMatch.$text = { $search: search };
            break;

        default:
            log.warn(`Неверный тип поиска: ${searchType}`);
    }

    return searchMatch;
};

export const buildFilterMatch = <TModel extends object, TFilter extends TFilterParamsServer>(
    query: TQuery<TModel, TFilter>,
    filterOptions: readonly TFilterOption<TModel>[]
): QueryFilter<TModel> => {
    const filterMatch = {} as Record<TDbField<TModel>, Expression>;

    filterOptions.forEach(option => {
        const { dbField, type } = option;

        switch (type) {
            case 'number': {
                const { minParamName, maxParamName, minLimit, maxLimit } = option;

                const minValue = query[minParamName] as number | undefined;
                const maxValue = query[maxParamName] as number | undefined;
                const minValueNum = typeof minValue === 'number' ? minValue : -Infinity;
                const maxValueNum = typeof maxValue === 'number' ? maxValue : Infinity;
                const minLimitNum = minLimit ?? -Infinity;
                const maxLimitNum = maxLimit ?? Infinity;

                if (minValueNum > minLimitNum && minValueNum !== -Infinity) {
                    filterMatch[dbField] = { $gte: minValueNum };
                }

                if (maxValueNum < maxLimitNum && maxValueNum !== Infinity) {
                    filterMatch[dbField] = {
                        ...(filterMatch[dbField] ?? {}),
                        $lte: maxValueNum
                    };
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
                const { minParamName, maxParamName, minLimit, maxLimit } = option;

                const minVal = query[minParamName] as Date | undefined;
                const maxVal = query[maxParamName] as Date | undefined;
                const minDate = minVal instanceof Date ? new Date(minVal) : new Date(NaN);
                const maxDate = maxVal instanceof Date ? new Date(maxVal) : new Date(NaN);
                const minLimitDate = minLimit ? new Date(minLimit) : new Date(-MAX_DATE_TS);
                const maxLimitDate = maxLimit ? new Date(maxLimit) : new Date(MAX_DATE_TS);

                let offsetNum = typeof query.timeZoneOffset === 'number' ? query.timeZoneOffset : 0;
                if (Math.abs(offsetNum) > MAX_TIMEZONE_OFFSET_MINUTES) {
                    offsetNum = 0;
                }

                if (!isNaN(minDate.getTime())) {
                    minDate.setUTCHours(0, 0, 0, 0); // Установка начала дня для даты
                    minDate.setMinutes(minDate.getMinutes() - offsetNum); // Смещение времени даты

                    if (minDate.getTime() > minLimitDate.getTime()) {
                        filterMatch[dbField] = { $gte: minDate };
                    }
                }

                if (!isNaN(maxDate.getTime())) {
                    maxDate.setUTCHours(23, 59, 59, 999); // Установка конца дня для даты
                    maxDate.setMinutes(maxDate.getMinutes() - offsetNum); // Смещение времени даты

                    if (maxDate.getTime() < maxLimitDate.getTime()) {
                        filterMatch[dbField] = {
                            ...(filterMatch[dbField] ?? {}),
                            $lte: maxDate
                        };
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
                const { paramName } = option;

                const value = query[paramName] as boolean | undefined;

                if (value === true) {
                    filterMatch[dbField] = true;
                } else if (value === false) {
                    filterMatch[dbField] = { $ne: true };
                }

                break;
            }

            case 'string': {
                const { paramName, defaultValue, valueOptions } = option;

                const value = query[paramName] as string | undefined;

                if (!value && defaultValue) {
                    filterMatch[dbField] = defaultValue;
                    break;
                }

                const valueOption = valueOptions.find(opt => opt.value === value);

                if (valueOption?.matches) {
                    filterMatch[dbField] = { $in: valueOption.matches };
                } else if (valueOption?.value) {
                    filterMatch[dbField] = valueOption.value;
                }

                break;
            }

            default:
                log.warn(`Неизвестный тип поля для фильтрации: ${type}`);
        }
    });

    return filterMatch as QueryFilter<TModel>;
};

export const parseSortParam = <TModel extends object>(
    sortParam: unknown,
    sortOptions: readonly ISortOption<TModel>[]
): IParseSortResult<TModel> => {
    const defaultOption = sortOptions[0];
    const defaultSortField = defaultOption?.dbField ?? '' as TDbField<TModel>;
    const defaultSortOrder = defaultOption?.defaultOrder === 'asc' ? 1 : -1;

    const sort = typeof sortParam === 'string' ? sortParam.trim() : '';
    if (!sort) return { sortField: defaultSortField, sortOrder: defaultSortOrder };

    const isDescending = sort.startsWith('-');
    const sortOrder = isDescending ? -1 : 1;
    
    const sortFieldCandidate = isDescending ? sort.slice(1) : sort;
    const matchedOption = sortOptions.find(opt => opt.dbField === sortFieldCandidate);

    return {
        sortField: matchedOption ? (matchedOption.dbField as TDbField<TModel>) : defaultSortField,
        sortOrder: matchedOption ? sortOrder : defaultSortOrder
    };
};

export const buildSortPipeline = <TModel extends object>(
    sortField: TDbField<TModel>,
    sortOrder: 1 | -1
): PipelineStage.FacetPipelineStage[] => [
    { $sort: { [sortField]: sortOrder } }
];

export const buildPaginatedPipeline = <TModel extends object>(
    query: TQuery<TModel>,
    sortOptions: readonly ISortOption<TModel>[],
    pageLimitOptions: readonly number[]
): PipelineStage.FacetPipelineStage[] => {
    // Настройка сортировки
    const { sortField, sortOrder } = parseSortParam(query.sort, sortOptions);
    const pipeline = buildSortPipeline(sortField, sortOrder);

    // Настройка пагинации
    const defaultPageLimit = pageLimitOptions[0] || 10;
    const maxPagelimit = pageLimitOptions.at(-1) || defaultPageLimit;

    const page = Math.max(query.page ?? 1, 1); // Номер страницы для результатов
    const rawLimit = query.limit ?? defaultPageLimit;
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
