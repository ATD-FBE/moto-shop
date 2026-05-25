import type {
    IAlertModalState,
    IConfirmModalState,
    IImageViewerModalState
} from './redux.types.js';

type TModalAction = ((...args: any[]) => Promise<void> | void) | null;

///////////////////
/// ALERT MODAL ///
///////////////////

export interface TAlertModalActions {
    onClose: TModalAction;
}

export type TOpenAlertModalParams = Omit<IAlertModalState, 'isOpen'> & Partial<TAlertModalActions> & {
    openDelay?: number;
};

/////////////////////
/// CONFIRM MODAL ///
/////////////////////

export interface TConfirmModalActions {
    onConfirm: TModalAction;
    onFinalize: TModalAction;
    onCancel: TModalAction;
    onClose: TModalAction;
}

export type TOpenConfirmModalParams = Omit<IConfirmModalState, 'isOpen'> & Partial<TConfirmModalActions> & {
    openDelay?: number;
};

//////////////////////////
/// IMAGE VIEWER MODAL ///
//////////////////////////

export interface TImageViewerModalActions {
    onClose: TModalAction;
}

export type TOpenImageViewerModalParams =
    Omit<IImageViewerModalState, 'isOpen'> &
    Partial<TImageViewerModalActions>;

////////////
/// CART ///
////////////

export interface ICartTotals {
    rawTotal: number;
    discountedTotal: number;
}
