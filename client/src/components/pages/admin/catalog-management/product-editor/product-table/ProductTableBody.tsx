import { useState, useRef, useEffect } from 'react';
import ProductTable from '../ProductTable.js';
import ProductTableRow from './product-table-body/ProductTableRow.jsx';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductTable>;

type TProductTableBodyProps = Pick<TParentProps,
    | 'loadStatus'
    | 'onReload'
    | 'products'
    | 'selectedIds'
    | 'expandedIds'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onConfirmDeletion'
    | 'onProcessProduct'
    | 'allowedCategories'
    | 'uiBlocked'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTableBody({
    loadStatus,
    onReload,
    products,
    allowedCategories,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    onProcessProduct,
    uiBlocked
}: TProductTableBodyProps): JSX.Element {
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
                    allowedCategories={allowedCategories}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onToggleSelection={onToggleSelection}
                    onToggleExpansion={onToggleExpansion}
                    onConfirmDeletion={onConfirmDeletion}
                    onProcessProduct={onProcessProduct}
                    uiBlocked={uiBlocked}
                />
            ))}
        </div>
    );
}
