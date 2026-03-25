export interface IAppErrorData {
    message: string;
    [key: string]: unknown;
}

export type TFieldErrors = Record<string, string>;

export interface IValidationErrors {
    unknownFieldError: Error | null;
    fieldErrors: TFieldErrors | null;
}
