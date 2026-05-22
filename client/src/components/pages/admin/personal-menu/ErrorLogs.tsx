import { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendErrorLogsRequest } from '@/api/logRequests.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IErrorLogsMainProps {
    loadStatus: TDataLoadStatus;
    reloadErrorLogs: () => void;
    errorLogs: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function ErrorLogs(): JSX.Element {
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [errorLogs, setErrorLogs] = useState('');

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();

    const errorLogsLoadStatus =
        loading
            ? DATA_LOAD_STATUS.LOADING
            : loadError
                ? DATA_LOAD_STATUS.ERROR
                : !errorLogs
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const loadErrorLogs = async () => {
        setLoadError(false);
        setLoading(true);

        const responseData = await dispatch(sendErrorLogsRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'LOG: LOAD ERRORS', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setLoadError(true);
        } else {
            setErrorLogs(responseData.text);
        }
        
        setLoading(false);
    };

    const reloadErrorLogs = (): void => {
        loadErrorLogs();
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Стартовая загрузка логов
    useEffect(() => {
        loadErrorLogs();
    }, []);

    // Прокрутка логов вниз, к последнему
    useEffect(() => {
        if (!errorLogs) return;

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }, [errorLogs]);

    return (
        <div className="error-logs-page">
            <header className="error-logs-header">
                <h2>Логи ошибок</h2>
            </header>

            <ErrorLogsMain
                loadStatus={errorLogsLoadStatus}
                reloadErrorLogs={reloadErrorLogs}
                errorLogs={errorLogs}
            />
        </div>
    );
}

function ErrorLogsMain({
    loadStatus,
    reloadErrorLogs,
    errorLogs
}: IErrorLogsMainProps): JSX.Element {
    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div className="error-logs-main">
                <div className="error-logs-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка логов ошибок...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div className="error-logs-main">
                <div className="error-logs-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Логи ошибок недоступны.
                    </p>
                    <button className="reload-btn" onClick={reloadErrorLogs}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div className="error-logs-main">
                <div className="error-logs-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        На данный момент ошибок нет.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="error-logs-main">
            <pre className="error-logs-output">{errorLogs}</pre>
        </div>
    );
}
