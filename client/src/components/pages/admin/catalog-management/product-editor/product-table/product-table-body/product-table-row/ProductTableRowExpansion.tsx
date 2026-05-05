import ProductTableRow from '../ProductTableRow.js';
import ProductForm from '@/components/pages/admin/catalog-management/product-editor/ProductForm.jsx';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductTableRow>;

type TProductTableRowExpansionProps = Pick<TParentProps,
    | 'product'
    | 'allowedCategories'
    | 'onProcessProduct'
    | 'uiBlocked'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTableRowExpansion({
    product,
    allowedCategories,
    onProcessProduct,
    uiBlocked
}: TProductTableRowExpansionProps): JSX.Element {
    return (
        <div className="table-row-expansion">
            <ProductForm
                product={product}
                allowedCategories={allowedCategories}
                onSubmit={onProcessProduct}
                uiBlocked={uiBlocked}
            />
        </div>
    );
}
