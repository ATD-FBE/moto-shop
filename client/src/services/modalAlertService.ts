import AppStore from '@/redux/Store.js';
import { showAlertModal, hideAlertModal } from '@/redux/slices/modalAlertSlice.js';
import type { IOpenAlertModalParams, TAlertModalCallbacks } from '@/types/index.js';

// Передача функций, которые нельзя хранить в Redux
let alertModalCallbacks: TAlertModalCallbacks = { onClose: null };

export const openAlertModal = ({
    openDelay = 0,
    type,
    dismissible,
    title,
    message,
    dismissBtnLabel,
    onClose = null
}: IOpenAlertModalParams): void => {
    setTimeout(() => {
        alertModalCallbacks = { onClose };
        AppStore.dispatch(showAlertModal({ type, dismissible, title, message, dismissBtnLabel }));
    }, openDelay);
};

export const getAlertModalCallbacks = (): TAlertModalCallbacks => {
    return alertModalCallbacks;
};

export const closeAlertModal = (): void => {
    alertModalCallbacks = { onClose: null };
    AppStore.dispatch(hideAlertModal());
};
