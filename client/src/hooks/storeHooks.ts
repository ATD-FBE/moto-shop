import { useSelector, TypedUseSelectorHook, useDispatch } from 'react-redux';
import { useLocation, Location } from 'react-router-dom';
import type { TAppDispatch, TRootState, TLocationState } from '@/types/index.js';

export const useAppSelector: TypedUseSelectorHook<TRootState> = useSelector;

export const useAppDispatch = (): TAppDispatch => useDispatch<TAppDispatch>();

export const useAppLocation = (): Location<TLocationState> => {
    const location = useLocation();
    return location as Location<TLocationState>;
};
