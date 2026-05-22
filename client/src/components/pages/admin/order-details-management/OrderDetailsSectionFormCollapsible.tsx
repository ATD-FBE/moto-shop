import Collapsible from '@/components/common/Collapsible.jsx';
import OrderDetailsSectionForm from './order-details-section-form-collapsible/OrderDetailsSectionForm.jsx';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type {
    TOrderDetailsEditSection,
    IOrderItemsSubmitResult,
    IOrderItemsResponseResult
} from '@/types/index.js';
import type { IOrder } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderDetailsSectionFormCollapsibleProps {
    isExpanded: boolean;
    section: TOrderDetailsEditSection;
    order: IOrder;
    itemsSubmitResult?: IOrderItemsSubmitResult | null;
    setIsItemsSubmitting?: Dispatch<SetStateAction<boolean>>;
    onItemsResponseResult?: (data: IOrderItemsResponseResult) => void;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderDetailsSectionFormCollapsible(
    { isExpanded, ...props }: IOrderDetailsSectionFormCollapsibleProps
): JSX.Element {
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
