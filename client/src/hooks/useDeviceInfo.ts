import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { markAsTouchDevice, setScreenSize } from '@/redux/slices/uiSlice.js';
import { SCREEN_SIZE } from '@/config/constants.js';

export default function useDeviceInfo(): null {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const detectDeviceInfo = (): void => {
            const isTouchDevice = 'ontouchstart' in window;
            dispatch(markAsTouchDevice(isTouchDevice));
    
            const width = window.innerWidth;
            const screenSize = Object.values(SCREEN_SIZE)
                .find(maxSize => width <= maxSize)
                ?? SCREEN_SIZE.LARGE;
            dispatch(setScreenSize(screenSize));
        };

        detectDeviceInfo();

        window.addEventListener('resize', detectDeviceInfo);
        return () => window.removeEventListener('resize', detectDeviceInfo);
    }, [dispatch]);

    return null;
}
