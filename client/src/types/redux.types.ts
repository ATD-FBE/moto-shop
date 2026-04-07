import { Location } from 'react-router-dom';
import { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import AppStore from '@/redux/Store.js';

export type TAppThunk<TReturnValue = void> = ThunkAction<
    TReturnValue,
    TRootState,
    unknown,
    UnknownAction
>;

export type TAppDispatch = typeof AppStore.dispatch;
export type TRootState = ReturnType<typeof AppStore.getState>;

export interface TLocationState {
    from?: Location;
    //itemId?: string;
}
