import React from 'react';
import ProductTableHeader from './product-table/ProductTableHeader.jsx';
import ProductTableBody from './product-table/ProductTableBody.jsx';
import ProductTableFooter from './product-table/ProductTableFooter.jsx';

export default function ProductTable({
    loadStatus,
    uiBlocked,
    products,
    filteredIds,
    selectedIds,
    expandedIds,
    onToggleAllSelection,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    onConfirmBulkDeletion,
    onReload,
    allowedCategories,
    onProcessForm,
    onProcessBulkForm
}) {
    return (
        <div role="table" className="entity-table product-table">
            <ProductTableHeader
                uiBlocked={uiBlocked}
                filteredIds={filteredIds}
                selectedIds={selectedIds}
                onToggleAllSelection={onToggleAllSelection}
            />

            <ProductTableBody
                loadStatus={loadStatus}
                uiBlocked={uiBlocked}
                products={products}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onConfirmDeletion={onConfirmDeletion}
                onReload={onReload}
                allowedCategories={allowedCategories}
                onProcessForm={onProcessForm}
            />

            <ProductTableFooter
                uiBlocked={uiBlocked}
                selectedIds={selectedIds}
                allowedCategories={allowedCategories}
                onProcessBulkForm={onProcessBulkForm}
                onConfirmBulkDeletion={onConfirmBulkDeletion}
            />
        </div>
    );
}
