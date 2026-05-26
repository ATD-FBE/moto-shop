import { useState, useRef, useEffect } from 'react';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import { EXTERNAL_SCRIPT_STATUS } from '@/config/constants.js';
import type { TExternalScriptStatus } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IUseExternalScriptParams {
    globalVar?: string;
    src: string;
    attrs?: Record<string, string>;
    removeOnUnmount?: boolean;
}

interface IUseExternalScriptResult {
    status: TExternalScriptStatus;
    reload: () => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function useExternalScript({
    globalVar,
    src,
    attrs = {},
    removeOnUnmount = false
}: IUseExternalScriptParams): IUseExternalScriptResult {
    const [status, setStatus, statusRef] = useSyncedStateWithRef<TExternalScriptStatus>(() => {
        if (globalVar && globalVar in window) return EXTERNAL_SCRIPT_STATUS.READY;
        return EXTERNAL_SCRIPT_STATUS.IDLE;
    });
    const [loadAttempt, setLoadAttempt] = useState(1);
    const removeOnUnmountRef = useRef(removeOnUnmount);
    const isUnmountedRef = useRef(false);

    const deleteScript = (script: HTMLScriptElement): void => {
        script.parentNode?.removeChild(script);
    }

    const reload = (): void => {
        setStatus(EXTERNAL_SCRIPT_STATUS.IDLE);
        setLoadAttempt(prev => prev + 1);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обновление removeOnUnmount
    useEffect(() => {
        removeOnUnmountRef.current = removeOnUnmount;
    }, [removeOnUnmount]);

    // Создание/нахождение скрипта, установка его статуса
    useEffect(() => {
        let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

        const isActuallyReady =
            script?.dataset.loaded === 'true' &&
            (!globalVar || globalVar in window);

        if (isActuallyReady) {
            setStatus(EXTERNAL_SCRIPT_STATUS.READY);
            return;
        }

        if (!script) {
            script = document.createElement('script');
            script.src = src;
            script.async = true;

            Object.entries(attrs).forEach(([key, value]) => {
                script?.setAttribute(key, value);
            });

            document.body.appendChild(script);
        }

        setStatus(
            script.dataset.loaded === 'true'
                ? EXTERNAL_SCRIPT_STATUS.WAITING
                : EXTERNAL_SCRIPT_STATUS.LOADING
        );

        let checkInterval: ReturnType<typeof setInterval> | undefined;

        const handleLoad = (): void => {
            if (isUnmountedRef.current) return;

            script.dataset.loaded = 'true';

            // Нет глобальной переменной или она уже установлена => статус готовности скрипта
            if (!globalVar || globalVar in window) {
                setStatus(EXTERNAL_SCRIPT_STATUS.READY);
                return;
            }
            
            // Установка статуса ожидания и проверка глобальной переменной через интервал
            setStatus(EXTERNAL_SCRIPT_STATUS.WAITING);

            let checkAttempts = 0;

            checkInterval = setInterval(() => {
                if (isUnmountedRef.current) {
                    clearInterval(checkInterval);
                    return;
                }

                checkAttempts++;

                if (globalVar in window) {
                    clearInterval(checkInterval);
                    setStatus(EXTERNAL_SCRIPT_STATUS.READY);
                } else if (checkAttempts > 50) { // Стоп через 5 секунд (50 * 100мс)
                    clearInterval(checkInterval);
                    setStatus(EXTERNAL_SCRIPT_STATUS.ERROR);
                    deleteScript(script);

                    console.error(
                        `Скрипт загружен, но глобальная переменная "${globalVar}" остутствует`
                    );
                }
            }, 100);
        };

        const handleError = (): void => {
            if (isUnmountedRef.current) return;

            setStatus(EXTERNAL_SCRIPT_STATUS.ERROR);
            deleteScript(script);
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        return () => {
            if (checkInterval) clearInterval(checkInterval);

            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);

            if (removeOnUnmountRef.current || statusRef.current !== EXTERNAL_SCRIPT_STATUS.READY) {
                deleteScript(script);
            }
        };
    }, [globalVar, src, loadAttempt]); // Без attrs и removeOnUnmount

    return { status, reload };
}
