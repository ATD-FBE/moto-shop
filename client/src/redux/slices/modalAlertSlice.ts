import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IAlertModalState, TOpenAlertModalParams } from '@/types/index.js';

const initialState: IAlertModalState = {
    isOpen: false
};

const modalAlertSlice = createSlice({
    name: 'modalAlert',
    initialState,
    reducers: {
        showAlertModal: (state, action: PayloadAction<TOpenAlertModalParams>) => {
            return { ...state, ...action.payload, isOpen: true };
        },

        hideAlertModal: () => {
            return { ...initialState };
        }
    }
});

export const { showAlertModal, hideAlertModal } = modalAlertSlice.actions;

export default modalAlertSlice.reducer;
