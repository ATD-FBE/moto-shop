import { useDispatch } from 'react-redux';
import type { TAppDispatch } from '@/types/index.js';

export const useAppDispatch = () => useDispatch<TAppDispatch>();
