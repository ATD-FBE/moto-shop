import { useState, useRef, useEffect } from 'react';
import ProductTableRow from './product-table-body/ProductTableRow.jsx';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';

export default function ProductTableBody({
    loadStatus,
    uiBlocked,
    products,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    onReload,
    allowedCategories,
    onProcessForm
}) {
    const [tableBodyHeight, setTableBodyHeight] = useState(LOAD_STATUS_MIN_HEIGHT);
    const tableBodyRef = useRef(null);

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
                        Загрузка товаров...
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
                        Ошибка сервера. Данные товаров не доступны.
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
                        Товары не найдены.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={tableBodyRef} role="rowgroup" className="table-body">
            {products.map(product => (
                <ProductTableRow
                    key={product.id}
                    product={product}
                    uiBlocked={uiBlocked}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleExpansion={onToggleExpansion}
                    onConfirmDeletion={onConfirmDeletion}
                    onProcessForm={onProcessForm}
                    allowedCategories={allowedCategories}
                />
            ))}
        </div>
    );
}
