import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TValidationErrorResponse,
    TCommonErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';

/// Общие типы ///
export interface INews {
    id: string;
    publishDate: string;
    title: string;
    content: string;
    createdBy?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
}


