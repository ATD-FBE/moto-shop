import type { FilterQuery, PipelineStage } from 'mongoose';
import type { TSearchTypes } from './constants.types.js';

export interface IOrderedFiltersArgs {
    computedFields: PipelineStage[];
    searchMatch: FilterQuery<any>;
    filterMatch: FilterQuery<any>;
    extraFilters: PipelineStage[];
    searchType: TSearchTypes;
}
