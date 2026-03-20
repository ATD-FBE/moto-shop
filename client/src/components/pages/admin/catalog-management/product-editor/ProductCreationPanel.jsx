import React, { useState } from 'react';
import cn from 'classnames';
import Collapsible from '@/components/common/Collapsible.jsx';
import ProductForm from './ProductForm.jsx';

export default function ProductCreationPanel({ uiBlocked, allowedCategories, onSubmit }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpansion = () => setIsExpanded(prev => !prev);

    return (
        <div className="product-creation-panel">
            <button
                className={cn('create-product-btn', { 'enabled': isExpanded })}
                onClick={toggleExpansion}
            >
                <span className="icon">{isExpanded ? '🔼' : '➕'}</span>
                {isExpanded ? 'Скрыть форму' : 'Создать товар'}
            </button>

            <Collapsible isExpanded={isExpanded} className="product-form-collapsible">
                <ProductForm
                    uiBlocked={uiBlocked}
                    allowedCategories={allowedCategories}
                    onSubmit={onSubmit}
                />
            </Collapsible>
        </div>
    );
}
