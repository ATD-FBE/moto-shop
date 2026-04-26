import React, { useState } from 'react';
import cn from 'classnames';
import Collapsible from '@/components/common/Collapsible.jsx';
import ProductTableRowMain from './product-table-row/ProductTableRowMain.jsx';
import ProductTableRowExpansion from './product-table-row/ProductTableRowExpansion.jsx';

export default function ProductTableRow({
    product,
    uiBlocked,
    selectedIds,
    expandedIds,
    onToggleSelection,
    onToggleExpansion,
    onConfirmDeletion,
    allowedCategories,
    onProcessForm
}) {
    const [hoveredItem, setHoveredItem] = useState(null);

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
                uiBlocked={uiBlocked}
                product={product}
                allowedCategories={allowedCategories}
                isHovered={isHovered}
                isSelected={isSelected}
                isExpanded={isExpanded}
                onToggleSelection={onToggleSelection}
                onToggleExpansion={onToggleExpansion}
                onConfirmDeletion={onConfirmDeletion}
            />

            <Collapsible isExpanded={isExpanded} className="table-row-expansion-collapsible">
                <ProductTableRowExpansion
                    uiBlocked={uiBlocked}
                    product={product}
                    allowedCategories={allowedCategories}
                    onProcessForm={onProcessForm}
                />
            </Collapsible>
        </div>
    );
}
