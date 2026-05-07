import ProductEditor from '../ProductEditor.js';
import ProductTableHeader from './product-table/ProductTableHeader.jsx';
import ProductTableBody from './product-table/ProductTableBody.jsx';
import ProductTableFooter from './product-table/ProductTableFooter.jsx';
import type { JSX, ComponentProps } from 'react';
import type {
    IDeletingProduct,
    TLeafCategories,
    TProductPerformFormSubmission
} from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductEditor>;

type TProductTableProps = Pick<TParentProps,
    | 'loadStatus'
    | 'products'
    | 'filteredIds'
    | 'selectedIds'
    | 'expandedIds'
    | 'onToggleAllSelection'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onReload'
    | 'uiBlocked'
> & {
    onConfirmDeletion: (product: IDeletingProduct) => void;
    onConfirmBulkDeletion: (productIds: string[]) => void;
    allowedCategories: TLeafCategories;
    onProcessProduct: (performFormSubmission: TProductPerformFormSubmission) => Promise<void>;
    onProcessBulkProduct: (performFormSubmission: TProductPerformFormSubmission) => Promise<void>;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTable({
    loadStatus,
    products,
    allowedCategories,
    filteredIds,
    selectedIds,
    expandedIds,
    onToggleAllSelection,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    onConfirmBulkDeletion,
    onReload,
    onProcessProduct,
    onProcessBulkProduct,
    uiBlocked
}: TProductTableProps): JSX.Element {
    return (
        <div role="table" className="entity-table product-table">
            <ProductTableHeader
                filteredIds={filteredIds}
                selectedIds={selectedIds}
                onToggleAllSelection={onToggleAllSelection}
                uiBlocked={uiBlocked}
            />

            <ProductTableBody
                loadStatus={loadStatus}
                onReload={onReload}
                products={products}
                allowedCategories={allowedCategories}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onConfirmDeletion={onConfirmDeletion}
                onProcessProduct={onProcessProduct}
                uiBlocked={uiBlocked}
            />

            <ProductTableFooter
                selectedIds={selectedIds}
                allowedCategories={allowedCategories}
                onProcessBulkProduct={onProcessBulkProduct}
                onConfirmBulkDeletion={onConfirmBulkDeletion}
                uiBlocked={uiBlocked}
            />
        </div>
    );
}
