import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IConfirmModalState, TOpenConfirmModalParams } from '@/types/index.js';

const initialState: IConfirmModalState = {
    isOpen: false
};

const modalConfirmSlice = createSlice({
    name: 'modalConfirm',
    initialState,
    reducers: {
        showConfirmModal: (state, action: PayloadAction<TOpenConfirmModalParams>) => {
            return { ...state, ...action.payload, isOpen: true };
        },

        hideConfirmModal: () => {
            return { ...initialState };
        }
    }
});

export const { showConfirmModal, hideConfirmModal } = modalConfirmSlice.actions;

export default modalConfirmSlice.reducer;
