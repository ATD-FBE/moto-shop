import CustomerTableOrders from './customer-table-row-expansion/CustomerTableOrders.jsx';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICustomerTableRowExpansionProps {
    customerId: string;
    customerName: string;
    isExpanded: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableRowExpansion(
    { ...props }: ICustomerTableRowExpansionProps
): JSX.Element {
    return (
        <div className="table-row-expansion">
            <CustomerTableOrders {...props} />
        </div>
    );
}
