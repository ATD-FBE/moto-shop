export default async function waitForRequestDelay(
    startTime: number,
    minTime: number = 500,
    signal?: AbortSignal
): Promise<void> {
    if (signal?.aborted) return; // Выход сразу, если запрос отменён

    const elapsedTime = Date.now() - startTime;
    const delay = Math.max(minTime - elapsedTime, 0);
    if (delay <= 0) return;

    // Отмена ожидания при отмене запроса во время ожидания
    await new Promise<void>(resolve => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const cleanup = () => {
            clearTimeout(timeoutId);
            signal?.removeEventListener('abort', cleanup);
            resolve();
        };

        timeoutId = setTimeout(cleanup, delay);
        signal?.addEventListener('abort', cleanup, { once: true });
    });
};
