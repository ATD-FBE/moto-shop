import { showAlertModal, hideAlertModal } from '@/redux/slices/modalAlertSlice.js';
import type { TOpenAlertModalParams, TAlertModalActions, TAppThunk } from '@/types/index.js';

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
}: TOpenAlertModalParams): TAppThunk<void> =>
    (dispatch) => {
        const trigger = () => {
            alertModalActions = { onClose };
            dispatch(showAlertModal({ type, dismissible, title, message, dismissBtnLabel }));
        };

        if (openDelay > 0) {
            setTimeout(trigger, openDelay);
        } else {
            trigger();
        }
    };

export const getAlertModalActions = (): TAlertModalActions => alertModalActions;

export const closeAlertModal = (): TAppThunk<void> =>
    (dispatch) => {
        alertModalActions = { onClose: null };
        dispatch(hideAlertModal());
    };
