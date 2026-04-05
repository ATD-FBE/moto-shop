import type { TEntityType, TFieldErrors } from '@shared/types/index.js';

export interface IAppErrorData {
    message: string;
    [key: string]: unknown;
}

export interface IParseValidationErrorsResult<E extends TEntityType = TEntityType> {
    systemFieldError: Error | null;
    fieldErrors: TFieldErrors<E> | null;
}
