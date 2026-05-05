import { useState } from 'react';
import cn from 'classnames';
import ProductTableBody from '../ProductTableBody.js';
import Collapsible from '@/components/common/Collapsible.jsx';
import ProductTableRowMain from './product-table-row/ProductTableRowMain.jsx';
import ProductTableRowExpansion from './product-table-row/ProductTableRowExpansion.jsx';
import type { JSX, ComponentProps } from 'react';
import type { IProduct } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof ProductTableBody>;

type TProductTableRowProps = Pick<TParentProps,
    | 'allowedCategories'
    | 'selectedIds'
    | 'expandedIds'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onConfirmDeletion'
    | 'onProcessProduct'
    | 'uiBlocked'
> & {
    product: IProduct;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductTableRow({
    product,
    allowedCategories,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    onProcessProduct,
    uiBlocked
}: TProductTableRowProps): JSX.Element {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const isHovered = hoveredItem === product.id;
    const isSelected = selectedIds.has(product.id);
    const isExpanded = expandedIds.has(product.id);

    return (
        <div
            className={cn('table-row', { 'hovered': isHovered })}
            onMouseEnter={() => setHoveredItem(product.id)}
            onMouseLeave={() => setHoveredItem(null)}
        >
            <ProductTableRowMain
                product={product}
                allowedCategories={allowedCategories}
                isHovered={isHovered}
                isSelected={isSelected}
                isExpanded={isExpanded}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onConfirmDeletion={onConfirmDeletion}
                uiBlocked={uiBlocked}
            />

            <Collapsible isExpanded={isExpanded} className="table-row-expansion-collapsible">
                <ProductTableRowExpansion
                    product={product}
                    allowedCategories={allowedCategories}
                    onProcessProduct={onProcessProduct}
                    uiBlocked={uiBlocked}
                />
            </Collapsible>
        </div>
    );
}
