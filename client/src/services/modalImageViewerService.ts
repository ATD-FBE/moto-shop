import AppStore from '@/redux/Store.js';
import { showImageViewerModal, hideImageViewerModal } from '@/redux/slices/modalImageViewerSlice.js';
import type { IOpenImageViewerModalParams, TImageViewerModalActions } from '@/types/index.js';

// Передача функций, которые нельзя хранить в Redux
let imageViewerModalActions: TImageViewerModalActions = { onClose: null };

export const openImageViewerModal = (
    { images, initialIndex, onClose = null }: IOpenImageViewerModalParams
): void => {
    imageViewerModalActions = { onClose };
    AppStore.dispatch(showImageViewerModal({ images, initialIndex }));
};

export const getImageViewerCallbacks = (): TImageViewerModalActions => {
    return imageViewerModalActions;
};

export const closeImageViewerModal = (): void => {
    imageViewerModalActions = { onClose: null };
    AppStore.dispatch(hideImageViewerModal());
};
