import type {
    TFormStatus,
    IBaseSubmitState,
    TFieldUiStatus,
    TFieldSaveStatus
} from './config.types.js';
import type { TRequestStatus } from '@shared/types/index.js';

////////////////////
/// FORM HELPERS ///
////////////////////

export interface IGetSubmitStatesResult {
    submitStates: Record<TFormStatus, IBaseSubmitState>;
    lockedStatuses: Set<TFormStatus>;
}

export interface ICommonFieldConfig {
    name: string;
    label: string;
    elem: string;
    type?: string;
    placeholder?: string;
    autoComplete?: 'on' | 'off';
    trim?: boolean;
}

export interface IFieldState {
    enabled?: boolean;
    files?: File[];
    value?: string | number | boolean;
    uiStatus: TFieldUiStatus | '';
    error: string;
    savedValue?: string | number | boolean;
    saveStatus?: TFieldSaveStatus | '';
    saveStatusMessage?: string;
    [key: string]: any; // Для любых других полей, добавленных в стейт
}

export interface IFieldStateEnabled extends IFieldState {
    enabled: boolean;
}

export type TFieldsState<TFieldName extends string> = Record<TFieldName, IFieldState>;

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
    | { type: 'RESET'; payload: TFieldsState<TFieldName> };

export interface IProcessFormFieldsResult<TFieldName extends string, TFormBody> {
    allValid: boolean;
    fieldStateUpdates: TFieldsState<TFieldName>;
    formFields: TFormBody;
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
