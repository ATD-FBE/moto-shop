import AppStore from '@/redux/Store.js';
import { showAlertModal, hideAlertModal } from '@/redux/slices/modalAlertSlice.js';
import type { TOpenAlertModalParams, TAlertModalActions } from '@/types/index.js';

// Передача функций, которые нельзя хранить в Redux Store
let alertModalActions: TAlertModalActions = { onClose: null };

export const openAlertModal = ({
    openDelay = 0,
    type,
    dismissible,
    title,
    message,
    dismissBtnLabel,
    onClose = null
}: TOpenAlertModalParams): void => {
    setTimeout(() => {
        alertModalActions = { onClose };
        AppStore.dispatch(showAlertModal({ type, dismissible, title, message, dismissBtnLabel }));
    }, openDelay);
};

export const getAlertModalActions = (): TAlertModalActions => {
    return alertModalActions;
};

export const closeAlertModal = (): void => {
    alertModalActions = { onClose: null };
    AppStore.dispatch(hideAlertModal());
};
