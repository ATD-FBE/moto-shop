import { createSlice } from '@reduxjs/toolkit';
import type { ILoadingState } from '@/types/index.js';

const initialState: ILoadingState = {
    activePageRequests: 0,
    activeApiRequests: 0,
    activeMediaRequests: 0
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        incrementPageRequests: (state) => {
            state.activePageRequests++;
        },

        decrementPageRequests: (state) => {
            state.activePageRequests--;
        },

        incrementApiRequests: (state) => {
            state.activeApiRequests++;
        },

        decrementApiRequests: (state) => {
            state.activeApiRequests--;
        },

        incrementMediaRequests: (state) => {
            state.activeMediaRequests++;
        },

        decrementMediaRequests: (state) => {
            state.activeMediaRequests--;
        }
    }
});

export const {
    incrementPageRequests,
    decrementPageRequests,
    incrementApiRequests,
    decrementApiRequests,
    incrementMediaRequests,
    decrementMediaRequests
} = loadingSlice.actions;

export default loadingSlice.reducer;
