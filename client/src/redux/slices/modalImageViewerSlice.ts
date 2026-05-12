import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IImageViewerModalState, TOpenImageViewerModalParams } from '@/types/index.js';

const initialState: IImageViewerModalState = {
    isOpen: false,
    images: [],
    initialIndex: 0
};

const modalImageViewerSlice = createSlice({
    name: 'modalImageViewer',
    initialState,
    reducers: {
        showImageViewerModal(state, action: PayloadAction<TOpenImageViewerModalParams>) {
            state.isOpen = true;
            state.images = action.payload.images;
            state.initialIndex = action.payload.initialIndex;
        },

        hideImageViewerModal() {
            return { ...initialState };
        }
    }
});

export const { showImageViewerModal, hideImageViewerModal } = modalImageViewerSlice.actions;
export default modalImageViewerSlice.reducer;
