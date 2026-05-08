type TModalAction = ((...args: any[]) => void) | null;

///////////////////
/// ALERT MODAL ///
///////////////////

export interface IOpenAlertModalParams {
    openDelay?: number;
    type?: 'info' | 'warn' | 'error';
    dismissible?: boolean;
    title?: string;
    message?: string;
    dismissBtnLabel?: string;
    onClose?: TModalAction;
}

export interface TAlertModalActions {
    onClose: TModalAction;
}

/////////////////////
/// CONFIRM MODAL ///
/////////////////////

export interface IOpenConfirmModalParams {
    openDelay?: number;
    dismissible?: boolean;
    prompt?: string;
    confirmBtnLabel?: string;
    cancelBtnLabel?: string;
    onConfirm?: TModalAction;
    onFinalize?: TModalAction;
    onCancel?: TModalAction;
    onClose?: TModalAction;
}

export interface TConfirmModalActions {
    onConfirm: TModalAction;
    onFinalize: TModalAction;
    onCancel: TModalAction;
    onClose: TModalAction;
}

//////////////////////////
/// IMAGE VIEWER MODAL ///
//////////////////////////

export interface IOpenImageViewerModalParams {
    images: { url: string, title: string }[];
    initialIndex: number;
    onClose?: TModalAction;
}

export interface TImageViewerModalActions {
    onClose: TModalAction;
}

////////////
/// CART ///
////////////

export interface ICartTotals {
    rawTotal: number;
    discountedTotal: number;
}
