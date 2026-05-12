import AppStore from '@/redux/Store.js';
import { showConfirmModal, hideConfirmModal } from '@/redux/slices/modalConfirmSlice.js';
import type { TOpenConfirmModalParams, TConfirmModalActions } from '@/types/index.js';

// Передача функций, которые нельзя хранить в Redux Store
let confirmModalActions: TConfirmModalActions = {
    onConfirm: null,
    onFinalize: null,
    onCancel: null,
    onClose: null
};

export const openConfirmModal = ({
    openDelay = 0,
    dismissible,
    prompt,
    confirmBtnLabel,
    cancelBtnLabel,
    onConfirm = null,
    onFinalize = null,
    onCancel = null,
    onClose = null
}: TOpenConfirmModalParams): void => {
    setTimeout(() => {
        confirmModalActions = { onConfirm, onCancel, onClose, onFinalize };
        AppStore.dispatch(showConfirmModal({ dismissible, prompt, confirmBtnLabel, cancelBtnLabel }));
    }, openDelay);
};

export const getconfirmModalActions = (): TConfirmModalActions => {
    return confirmModalActions;
};

export const closeConfirmModal = (): void => {
    confirmModalActions = { onConfirm: null, onCancel: null, onClose: null, onFinalize: null };
    AppStore.dispatch(hideConfirmModal());
};
