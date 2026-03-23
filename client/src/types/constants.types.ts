import { FIELD_SAVE_STATUS, FORM_STATUS } from '@/config/constants.js';
import type { TIntent } from '@shared/types/index.js';

export type TFieldSaveStatus = typeof FIELD_SAVE_STATUS[keyof typeof FIELD_SAVE_STATUS];

export type TFormStatus = typeof FORM_STATUS[keyof typeof FORM_STATUS];

export interface IBaseSubmitState {
    readonly icon?: string;
    readonly mainMessage?: string;
    readonly addMessage?: string;
    readonly submitBtnLabel: string;
    readonly cancelBtnLabel: string;
    readonly intent?: TIntent;
    readonly locked?: boolean;
}
