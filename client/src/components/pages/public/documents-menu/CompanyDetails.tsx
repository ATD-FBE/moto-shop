import { useRef, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendCompanyDetailsPdfRequest } from '@/api/companyRequests.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import triggerFileDownload from '@/services/triggerFileDownload.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
 
export default function CompanyDetails(): JSX.Element {
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const downloadCompanyDetails = async () => {
        const responseData = await dispatch(sendCompanyDetailsPdfRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'COMPANY: LOAD DETAILS', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось скачать документ',
                message: 'Ошибка при скачивании реквизитов магазина.\nПодробности ошибки в консоли.'
            });
        } else {
            const { blob, filename } = responseData;
            triggerFileDownload(blob, filename);
        }
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div className="company-details-page">
            <header className="company-details-header">
                <h2>Реквизиты магазина</h2>
            </header>

            <div className="company-details-main">
                <p>
                    Официальные данные магазина для оформления платежей и документов.<br />
                    Используются при расчётах и бухгалтерском учёте.
                </p>
                <p>
                    <button
                        className="doc-link"
                        onClick={downloadCompanyDetails}
                    >
                        <span className="icon">📄</span>
                        Документ в формате PDF
                    </button>
                </p>
            </div>
        </div>
    );
}

/*
Поля для документа MongoDB в коллекции CompanyDetails:

{
    "_id": "static",
    "companyName": "...",
    "shopName": "...",
    "inn": "...",
    "ogrn": "...",
    "phone": "...",
    "email": "...",
    "legalAddress": "...",
    "displayAddress": "...",
    "bank": {
        "name": "...",
        "bik": "...",
        "rs": "...",
        "ks": "..."
    }
}
*/
