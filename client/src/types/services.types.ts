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
    onClose?: TAlertModalOnClose;
}

export interface TAlertModalCallbacks {
    onClose: TAlertModalOnClose;
}

export type TAlertModalOnClose = (() => void) | null;
