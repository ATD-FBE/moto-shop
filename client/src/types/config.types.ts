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
    icon?: string;
    mainMessage?: string;
    addMessage?: string;
    submitBtnLabel: string;
    cancelBtnLabel?: string;
    intent?: TIntent;
    locked?: boolean;
}
