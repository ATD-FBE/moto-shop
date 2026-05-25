import type {
    TRoute,
    TAuthNavType,
    TFormStatus,
    TSubmitStates,
    TFieldUiStatus,
    TFieldSaveStatus
} from './config.types.js';

/////////////////////
/// ROUTE HELPERS ///
/////////////////////

type TRouteNav = Extract<TRoute, { nav?: any }>['nav'];
type TNavBadge = Extract<TRouteNav, { badge?: any }>['badge'];

export type TRoutePath = TRoute['paths'][number];

export interface INavItem {
    label: TRoute['label'] | string;
    paths: TRoute['paths'] | string[];
    order?: number;
    authType?: TAuthNavType;
    featured?: boolean;
    badge?: TNavBadge;
    children?: INavItem[];
}

export interface IBreadcrumb {
    label: TRoute['label'];
    parentPath?: TRoutePath;
    generatePath?: Extract<TRoute, { generatePath?: any }>['generatePath'];
    paramSchema?: Extract<TRoute, { paramSchema?: any }>['paramSchema'];
}

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
    readonly fieldConfigs: readonly IFieldConfig[];
}

export type TFieldStateValue = string | number | boolean;
export type TFieldApiValue = string | number | boolean | string[] | File | File[] | null | undefined;

export interface IFieldConfig {
    readonly name: string;
    readonly label?: string;
    readonly elem: string;
    readonly type?: string;
    readonly step?: number;
    readonly min?: number;
    readonly max?: number;
    readonly multiple?: boolean;
    readonly filesLimit?: number;
    readonly accept?: string;
    readonly allowedTypes?: readonly string[];
    readonly maxSizeMB?: number;
    readonly options?: readonly { value: string; label: string; }[]
    readonly defaultValue?: TFieldStateValue;
    readonly outputValue?: string;
    readonly placeholder?: string;
    readonly autoComplete?: string;
    readonly trim?: boolean;
    readonly address?: boolean;
    readonly checkboxLabel?: string;
    readonly tooltip?: string;
    readonly relatedFields?: string[];
    readonly enabled?: boolean;
    readonly optional?: boolean;
    readonly lock?: boolean;
    readonly canApply?: (data: any) => boolean;
}

export interface IFieldState {
    enabled?: boolean;
    value: TFieldStateValue;
    files?: File[];
    uiStatus: TFieldUiStatus | '';
    error: string;
    savedValue?: TFieldStateValue;
    saveStatus?: TFieldSaveStatus | '';
    saveStatusMessage?: string;
    [key: string]: unknown; // Добавленные поля конфигов в стейт
}

export type TFormState<TFieldName extends string> = Record<TFieldName, IFieldState>;

export type TFieldsAction<TFieldName extends string> =
    | { type: 'UPDATE'; payload: Partial<Record<TFieldName, Partial<IFieldState>>> }
    | { type: 'ENABLE'; payload: { name: TFieldName } }
    | { 
        type: 'SAVE'; 
        payload: { 
            fields: Partial<Record<TFieldName, TFieldStateValue>>;
            status: TFieldSaveStatus; 
        } 
    }
    | { type: 'CLEAR_SAVE_STATUS'; payload: { name: TFieldName } }
    | { type: 'RESET'; payload: TFormState<TFieldName> };

export interface IProcessFormFieldsResult<TFieldName extends string, TFormBody> {
    allValid: boolean;
    fieldsStateUpdates: Partial<Record<TFieldName, Partial<IFieldState>>>;
    formFields: TFormBody;
    changedFields?: TFieldName[];
}

export interface IProcessSingleFormFieldResult<TFieldName extends string, TFormBody> {
    isValid: boolean;
    fieldsStateUpdates: Partial<Record<TFieldName, Partial<IFieldState>>>;
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
