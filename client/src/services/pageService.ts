import { incrementPageRequests, decrementPageRequests } from '@/redux/slices/loadingSlice.js';
import { toError } from '@shared/commonHelpers.js';
import type { ComponentType } from 'react';
import type { TAppThunk } from '@/types/index.js';

export const fetchPageChunk = (
    importComponent: () => Promise<{ default: ComponentType }>
): TAppThunk<Promise<void>> =>
    async (dispatch) => {
        try {
            dispatch(incrementPageRequests());
            await importComponent();
        } catch (err) {
            console.error('Ошибка загрузки страницы:', toError(err).message);
        } finally {
            dispatch(decrementPageRequests());
        }
    };
