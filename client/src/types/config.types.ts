import { routeConfig } from '@/config/appRouting.js';
import {
    SCREEN_SIZE,
    AUTH_NAV_TYPE,
    CATEGORY_FORM_MODE,
    ORDER_DETAILS_EDIT_SECTION,
    FIELD_UI_STATUS,
    FIELD_SAVE_STATUS,
    DATA_LOAD_STATUS,
    FORM_STATUS
} from '@/config/constants.js';
import type { TIntent } from '@shared/types/index.js';

///////////////////
/// APP ROUTING ///
///////////////////

export type TRouteConfig = typeof routeConfig;
export type TRoute = TRouteConfig[keyof typeof routeConfig];

/////////////////
/// CONSTANTS ///
/////////////////

export type TScreenSize = typeof SCREEN_SIZE[keyof typeof SCREEN_SIZE];

export type TAuthNavType = typeof AUTH_NAV_TYPE[keyof typeof AUTH_NAV_TYPE];

export type TCategoryFormMode = typeof CATEGORY_FORM_MODE[keyof typeof CATEGORY_FORM_MODE];

export type TOrderDetailsEditSection = typeof ORDER_DETAILS_EDIT_SECTION[
    keyof typeof ORDER_DETAILS_EDIT_SECTION
];

export type TFieldUiStatus = typeof FIELD_UI_STATUS[keyof typeof FIELD_UI_STATUS];

export type TFieldSaveStatus = typeof FIELD_SAVE_STATUS[keyof typeof FIELD_SAVE_STATUS];

export type TDataLoadStatus = typeof DATA_LOAD_STATUS[keyof typeof DATA_LOAD_STATUS];

export type TFormStatus = typeof FORM_STATUS[keyof typeof FORM_STATUS];

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
