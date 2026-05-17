import React from 'react';
import Collapsible from '@/components/common/Collapsible.jsx';
import OrderDetailsSectionForm from './order-details-section-form-collapsible/OrderDetailsSectionForm.jsx';

export default function OrderDetailsSectionFormCollapsible({ isExpanded, ...props }) {
    return (
        <Collapsible
            isExpanded={isExpanded}
            className="order-details-section-form-collapsible"
            showContextIndicator={false}
        >
            <OrderDetailsSectionForm {...props} />
        </Collapsible>
    );
}
