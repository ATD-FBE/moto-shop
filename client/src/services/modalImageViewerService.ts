import { showImageViewerModal, hideImageViewerModal } from '@/redux/slices/modalImageViewerSlice.js';
import type { TOpenImageViewerModalParams, TImageViewerModalActions, TAppThunk } from '@/types/index.js';

// Передача функций, которые нельзя хранить в Redux
let imageViewerModalActions: TImageViewerModalActions = { onClose: null };

export const openImageViewerModal = (
    { images, initialIndex, onClose = null }: TOpenImageViewerModalParams
): TAppThunk<void> =>
    (dispatch) => {
        imageViewerModalActions = { onClose };
        dispatch(showImageViewerModal({ images, initialIndex }));
    };

export const getImageViewerCallbacks = (): TImageViewerModalActions => imageViewerModalActions;

export const closeImageViewerModal = (): TAppThunk<void> =>
    (dispatch) => {
        imageViewerModalActions = { onClose: null };
        dispatch(hideImageViewerModal());
    };
