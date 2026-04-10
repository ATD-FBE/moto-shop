import {
    FORM_STATUS,
    FIELD_UI_STATUS,
    FIELD_SAVE_STATUS
} from '@/config/constants.js';
import type { TIntent } from '@shared/types/index.js';

/////////////////
/// CONSTANTS ///
/////////////////

export type TFormStatus = typeof FORM_STATUS[keyof typeof FORM_STATUS];

export type TFieldUiStatus = typeof FIELD_UI_STATUS[keyof typeof FIELD_UI_STATUS];

export type TFieldSaveStatus = typeof FIELD_SAVE_STATUS[keyof typeof FIELD_SAVE_STATUS];

export interface IBaseSubmitState {
    readonly icon?: string;
    readonly mainMessage?: string;
    readonly addMessage?: string;
    readonly submitBtnLabel: string;
    readonly cancelBtnLabel?: string;
    readonly intent?: TIntent;
    readonly locked?: boolean;
}

export type TSubmitStates = Record<TFormStatus, IBaseSubmitState>;
