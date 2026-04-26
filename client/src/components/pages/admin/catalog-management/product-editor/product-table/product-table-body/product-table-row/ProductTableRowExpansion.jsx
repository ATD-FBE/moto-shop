import React from 'react';
import ProductForm from '../../../ProductForm.jsx';

export default function ProductTableRowExpansion({
    uiBlocked,
    product,
    allowedCategories,
    onProcessForm
}) {
    return (
        <div className="table-row-expansion">
            <ProductForm
                uiBlocked={uiBlocked}
                product={product}
                allowedCategories={allowedCategories}
                onSubmit={onProcessForm}
            />
        </div>
    );
}
