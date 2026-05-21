import BlockableLink from '@/components/common/BlockableLink.jsx';
import { routeConfig } from '@/config/appRouting.js';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICardOnlinePaymentLinkProps {
    orderId: string;
    orderNumber: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CardOnlinePaymentLink(
    { orderId, orderNumber }: ICardOnlinePaymentLinkProps
): JSX.Element {
    return (
        <BlockableLink
            className="card-online-payment-link"
            to={routeConfig.customerOrderCardOnlinePayment.generatePath({ orderId, orderNumber })}
        >
            <span className="icon">💳</span>
            {'  '}
            Оплатить
        </BlockableLink>
    );
}
