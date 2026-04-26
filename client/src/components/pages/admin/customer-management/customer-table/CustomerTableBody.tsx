import { useState, useRef, useEffect } from 'react';
import CustomerTable from '../CustomerTable.jsx';
import CustomerTableRow from './customer-table-body/CustomerTableRow.jsx';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CustomerTable>;

type TCustomerTableBodyProps = Pick<TParentProps,
    | 'loadStatus'
    | 'uiBlocked'
    | 'customers'
    | 'selectedIds'
    | 'expandedIds'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onUpdateDiscount'
    | 'onUpdateBanStatus'
    | 'onReload'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableBody({
    loadStatus,
    uiBlocked,
    customers,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onUpdateDiscount,
    onUpdateBanStatus,
    onReload
}: TCustomerTableBodyProps): JSX.Element {
    const [tableBodyHeight, setTableBodyHeight] = useState(LOAD_STATUS_MIN_HEIGHT);
    const tableBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!tableBodyRef.current) return;

        const newHeight = tableBodyRef.current.offsetHeight;
        if (newHeight !== tableBodyHeight) setTableBodyHeight(newHeight);
    }, [loadStatus]);

    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div
                className="table-body"
                style={{ height: Math.max(LOAD_STATUS_MIN_HEIGHT, tableBodyHeight) }}
            >
                <div className="table-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка клиентов...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div ref={tableBodyRef} className="table-body" style={{ height: LOAD_STATUS_MIN_HEIGHT }}>
                <div className="table-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Данные клиентов не доступны.
                    </p>
                    <button className="reload-btn" onClick={onReload}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div ref={tableBodyRef} className="table-body" style={{ height: LOAD_STATUS_MIN_HEIGHT }}>
                <div className="table-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        Клиенты не найдены.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={tableBodyRef} role="rowgroup" className="table-body">
            {customers.map(customer => (
                <CustomerTableRow
                    key={customer.id}
                    customer={customer}
                    uiBlocked={uiBlocked}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleExpansion={onToggleExpansion}
                    onUpdateDiscount={onUpdateDiscount}
                    onUpdateBanStatus={onUpdateBanStatus}
                />
            ))}
        </div>
    );
}
