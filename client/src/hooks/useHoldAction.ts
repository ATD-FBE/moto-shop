import { useRef, useCallback, useEffect } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IUseHoldActionReturn {
    start: () => void;
    stop: () => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function useHoldAction(
    callback: () => void,
    startDelay: number = 400,
    maxDelay: number = 70,
    minDelay: number = 10,
    acceleration: number = 0.96
): IUseHoldActionReturn {
    const isHoldingRef = useRef(false);
    const currentDelayRef = useRef(maxDelay);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const step = useCallback(() => {
        if (!isHoldingRef.current) return;

        callback();

        currentDelayRef.current = Math.max(minDelay, currentDelayRef.current * acceleration);
        timeoutRef.current = setTimeout(step, currentDelayRef.current);
    }, [callback, acceleration, minDelay]);

    const start = useCallback(() => {
        if (isHoldingRef.current) return;

        isHoldingRef.current = true;
        currentDelayRef.current = maxDelay;

        callback(); // Изменение сразу при нажатии

        timeoutRef.current = setTimeout(step, startDelay);
    }, [callback, step, maxDelay, startDelay]);

    const stop = useCallback(() => {
        isHoldingRef.current = false;
        clearTimeout(timeoutRef.current);
    }, []);

    // Очистка при размонтировании компонента
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return { start, stop };
}
