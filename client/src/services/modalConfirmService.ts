import { showConfirmModal, hideConfirmModal } from '@/redux/slices/modalConfirmSlice.js';
import type { TOpenConfirmModalParams, TConfirmModalActions, TAppThunk } from '@/types/index.js';

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
}: TOpenConfirmModalParams): TAppThunk<void> =>
    (dispatch) => {
        const trigger = () => {
            confirmModalActions = { onConfirm, onCancel, onClose, onFinalize };
            dispatch(showConfirmModal({ dismissible, prompt, confirmBtnLabel, cancelBtnLabel }));
        };

        if (openDelay > 0) {
            setTimeout(trigger, openDelay);
        } else {
            trigger();
        }
    };

export const getConfirmModalActions = (): TConfirmModalActions => confirmModalActions;

export const closeConfirmModal = (): TAppThunk<void> =>
    (dispatch) => {
        confirmModalActions = { onConfirm: null, onCancel: null, onClose: null, onFinalize: null };
        dispatch(hideConfirmModal());
    };
