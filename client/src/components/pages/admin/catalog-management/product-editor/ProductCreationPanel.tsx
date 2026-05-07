import { useState } from 'react';
import cn from 'classnames';
import Collapsible from '@/components/common/Collapsible.jsx';
import ProductForm from './ProductForm.jsx';
import type { JSX } from 'react';
import type { TLeafCategories, TProductPerformFormSubmission } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductCreationPanelProps {
    uiBlocked: boolean;
    allowedCategories: TLeafCategories;
    onProcessProduct: (performFormSubmission: TProductPerformFormSubmission) => Promise<void>;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductCreationPanel(
    { uiBlocked, allowedCategories, onProcessProduct }: IProductCreationPanelProps
): JSX.Element {
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
                    product={null}
                    allowedCategories={allowedCategories}
                    onSubmit={onProcessProduct}
                    uiBlocked={uiBlocked}
                />
            </Collapsible>
        </div>
    );
}
