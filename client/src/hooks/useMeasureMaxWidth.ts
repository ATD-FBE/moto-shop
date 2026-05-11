import { useState, useLayoutEffect } from 'react';

export default function useMeasureMaxWidth(
    elements: HTMLElement[],
    options: { enabled?: boolean } = {}
): number {
    const { enabled = true } = options;

    const [maxWidth, setMaxWidth] = useState(0);

    useLayoutEffect(() => {
        if (!enabled) {
            setMaxWidth(0);
            return;
        }
        if (!elements.length) return;

        const getMax = (): number => Math.max(0, ...elements.map(el => el.offsetWidth));

        let rafId: number | null = null;

        const update = (): void => {
            rafId = requestAnimationFrame(() => {
                setMaxWidth(getMax());
            });
        };

        update();

        const observer = new ResizeObserver(update);
        elements.forEach(el => observer.observe(el));

        return () => {
            observer.disconnect();
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [enabled, elements]);

    return maxWidth;
}
