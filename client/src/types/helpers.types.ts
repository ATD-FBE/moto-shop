import type {
    TFormStatus,
    TSubmitStates,
    TFieldUiStatus,
    TFieldSaveStatus
} from './config.types.js';
import type { TRequestStatus } from '@shared/types/index.js';

////////////////////
/// FORM HELPERS ///
////////////////////

export interface IGetSubmitStatesResult {
    submitStates: TSubmitStates;
    lockedStatuses: Set<TFormStatus>;
}

export interface IFormGroupConfig {
    readonly name: string;
    readonly title?: string;
    readonly description?: string;
    readonly collapsible?: boolean;
    readonly fieldConfigs?: readonly IFieldConfig[];
}

export type TFieldValue = string | number | boolean;

export interface IFieldConfig {
    readonly name: string;
    readonly label: string;
    readonly elem: string;
    readonly type?: string;
    readonly options?: readonly { value: string; label: string; }[]
    readonly defaultValue?: TFieldValue;
    readonly placeholder?: string;
    readonly autoComplete?: 'on' | 'off';
    readonly trim?: boolean;
    readonly isPassword?: boolean;
    readonly checkboxLabel?: string;
    readonly tooltip?: string;
    readonly enabled?: boolean;
    readonly optional?: boolean;
    readonly canApply?: (data: any) => boolean;
}

export interface IFieldState {
    enabled?: boolean;
    value: TFieldValue;
    files?: File[];
    uiStatus: TFieldUiStatus | '';
    error: string;
    savedValue?: TFieldValue;
    saveStatus?: TFieldSaveStatus | '';
    saveStatusMessage?: string;
    [key: string]: TFieldValue | File[] | undefined; // Добавленные поля конфигов в стейт
}

export type TFormState<TFieldName extends string> = Record<TFieldName, IFieldState>;

export type TFieldsAction<TFieldName extends string> =
    | { type: 'UPDATE'; payload: Partial<Record<TFieldName, Partial<IFieldState>>> }
    | { type: 'TOGGLE_ENABLED'; payload: { name: TFieldName } }
    | { 
        type: 'SAVE'; 
        payload: { 
            fields: Partial<Record<TFieldName, Partial<IFieldState>>>;
            status: TFieldSaveStatus | ''; 
        } 
    }
    | { type: 'RESET'; payload: TFormState<TFieldName> };

export interface IProcessFormFieldsResult<TFieldName extends string, TFormBody> {
    allValid: boolean;
    fieldsStateUpdates: Partial<Record<TFieldName, Partial<IFieldState>>>;
    formFields: TFormBody;
    changedFields?: TFieldName[];
}

export interface IProcessFormattedFieldDeletionContext {
    value: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    charRegex?: RegExp;
    format?: (val: string) => string;
}

export interface IProcessFormattedFieldDeletionResult {
    preventDefault: boolean;
    nextValue: string;
    nextCursorPos: number;
}

//////////////////////
/// REQUEST LOGGER ///
//////////////////////

export interface ILogRequestStatusConfig {
    context?: string;
    status?: TRequestStatus;
    message?: string;
    details?: unknown;
    unhandled?: boolean;
}
