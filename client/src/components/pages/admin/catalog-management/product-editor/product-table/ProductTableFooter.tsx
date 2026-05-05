import { useState } from 'react';
import cn from 'classnames';
import ProductTable from '../ProductTable.js';
import Collapsible from '@/components/common/Collapsible.jsx';
import BulkProductForm from './product-table-footer/BulkProductForm.jsx';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductTable>;

type TProductTableFooterProps = Pick<TParentProps,
    | 'selectedIds'
    | 'allowedCategories'
    | 'onProcessBulkProduct'
    | 'onConfirmBulkDeletion'
    | 'uiBlocked'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTableFooter({
    selectedIds,
    allowedCategories,
    onProcessBulkProduct,
    onConfirmBulkDeletion,
    uiBlocked
}: TProductTableFooterProps): JSX.Element {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="table-footer-wrapper">
            <div role="rowgroup" className="table-footer">
                <div role="row">
                    <div role="columnfooter" className="row-cell select-label">
                        <div className="cell-label visible">Выбранные товары:</div>
                        <div className="cell-content">{selectedIds.size}</div>
                    </div>
                    <div role="columnfooter" className="row-cell edit-bulk-product">
                        <div className="cell-label">Редактирование группы:</div>
                        <div className="cell-content">
                            <button
                                className={cn('edit-bulk-product-btn', { 'enabled': isExpanded })}
                                onClick={() => setIsExpanded(prev => !prev)}
                            >
                                <span className="icon">{isExpanded ? '🔼' : '🖊'}</span>
                                {isExpanded ? 'Скрыть форму' : 'Править группу'}
                            </button>
                        </div>
                    </div>
                    <div role="columnfooter" className="row-cell delete-bulk-product">
                        <div className="cell-label">Удаление группы:</div>
                        <div className="cell-content">
                            <button
                                className="delete-bulk-product-btn"
                                onClick={() => onConfirmBulkDeletion([...selectedIds])}
                                disabled={uiBlocked || !selectedIds.size}
                            >
                                <span className="icon">❌</span>
                                Удалить группу
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Collapsible isExpanded={isExpanded} className="bulk-product-form-collapsible">
                <BulkProductForm
                    productIds={[...selectedIds]}
                    allowedCategories={allowedCategories}
                    onSubmit={onProcessBulkProduct}
                    uiBlocked={uiBlocked}
                />
            </Collapsible>
        </div>
    );
}
