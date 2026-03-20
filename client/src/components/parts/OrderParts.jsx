import React, { useState, useRef, useEffect }  from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'classnames';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import { sendOrderInvoicePdfRequest, sendOrderRequest } from '@/api/orderRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { pluralize, formatCurrency } from '@/helpers/textHelpers.js';
import triggerFileDownload from '@/services/triggerFileDownload.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { isEqualCurrency } from '@shared/commonHelpers.js';
import {
    REQUEST_STATUS,
    DELIVERY_METHOD_OPTIONS,
    PAYMENT_METHOD,
    PAYMENT_METHOD_OPTIONS,
    TRANSACTION_TYPE,
    ORDER_STATUS_CONFIG,
    ORDER_ACTIVE_STATUSES,
    FINANCIALS_STATE_CONFIG,
    FINANCIALS_EVENT_CONFIG,
    CLIENT_CONSTANTS
} from '@shared/constants.js';

const { NO_VALUE_LABEL } = CLIENT_CONSTANTS;

export function OrderCardOverview({
    id,
    orderNumber,
    confirmedAt,
    totalOrderItems,
    totalAmount
}) {
    const userRole = useSelector(state => state.auth.user?.role ?? 'guest');

    const orderUrl = routeConfig[`${userRole}OrderDetails`]
        ?.generatePath({ orderNumber, orderId: id }) || '/';

    const confirmedDateTime = new Date(confirmedAt)?.toLocaleString();

    const orderSummaryDisplay =
        `${totalOrderItems} ` +
        pluralize(totalOrderItems, ['товарная позиция', 'товарные позиции', 'товарных позиций']) +
        ` на сумму ${formatCurrency(totalAmount)} руб.`;

    return (
        <div className="order-summary">
            <BlockableLink to={orderUrl}>Заказ №{orderNumber}</BlockableLink>
            {` от ${confirmedDateTime} — ${orderSummaryDisplay}`}
        </div>
    );
}

export function OrderCardInfoGrid({
    id,
    orderNumber,
    confirmedAt,
    totalAmount,
    totalPaid,
    totalRefunded,
    orderStatus,
    deliveryMethod,
    defaultPaymentMethod,
    allowCourierExtra,
    currentOnlineTransaction,
    renderCardOnlinePaymentLink
}) {
    const confirmedDate = new Date(confirmedAt)?.toLocaleDateString();
    const netPaid = totalPaid - totalRefunded;
    const paymentBalance = netPaid - totalAmount;

    const isActiveOrder = ORDER_ACTIVE_STATUSES.includes(orderStatus);
    const isOverpaid = !isEqualCurrency(paymentBalance, 0) && paymentBalance > 0;
    const isUnpaid = !isEqualCurrency(paymentBalance, 0) && paymentBalance < 0;

    const showPaymentBalance = (isActiveOrder && netPaid !== 0 && paymentBalance !== 0) || isOverpaid;
    const isCardOnlineMethod = defaultPaymentMethod === PAYMENT_METHOD.CARD_ONLINE;

    const showCardOnlinePaymentLink =
        renderCardOnlinePaymentLink &&
        isCardOnlineMethod &&
        isActiveOrder &&
        isUnpaid &&
        !currentOnlineTransaction;

    const onlineTransactionProcessText =
        currentOnlineTransaction?.type === TRANSACTION_TYPE.PAYMENT
            ? 'Онлайн-оплата в процессе…'
            : currentOnlineTransaction?.type === TRANSACTION_TYPE.REFUND
                ? 'Возврат средств в обработке…'
                : null;

    const formattedTotalAmount = formatCurrency(totalAmount);
    const formattedNetPaid = formatCurrency(netPaid);
    const formattedPaymentBalance = formatCurrency(paymentBalance);

    const packingStatusDisplay = ORDER_STATUS_CONFIG[orderStatus]?.packingLabel ?? '';
    const paymentMethodDisplay = PAYMENT_METHOD_OPTIONS
        .find(opt => opt.value === defaultPaymentMethod)?.label ?? '';
    const deliveryMethodDisplay = DELIVERY_METHOD_OPTIONS
        .find(opt => opt.value === deliveryMethod)?.label ?? '';

    return (
        <div className="order-info-grid">
            <div className="order-info-label order-number">Номер заказа</div>
            <div className="order-info-value order-number">{orderNumber}</div>

            <div className="order-info-label order-date">Дата оформления</div>
            <div className="order-info-value order-date">{confirmedDate}</div>

            <div className="order-info-label order-total">Сумма к оплате</div>
            <div className="order-info-value order-total">{formattedTotalAmount} руб.</div>

            <div className="order-info-label order-paid">
                <span className="paid-wrapper">
                    Фактически оплачено
                    <span className="info" title="Сумма, оплаченная с учётом возвратов">ⓘ</span>
                </span>
            </div>
            <div className="order-info-value order-paid">
                <span className="paid-wrapper">
                    {formattedNetPaid}
                    {showPaymentBalance && (
                        <span className={cn('balance', {
                            'positive': paymentBalance > 0,
                            'negative': paymentBalance < 0
                        })}>
                            {paymentBalance > 0 && '+'}{formattedPaymentBalance}
                        </span>
                    )}
                    {' руб.'}
                </span>
            </div>

            <div className="order-info-label order-payment-method">Способ оплаты</div>
            <div className="order-info-value order-payment-method">
                <div className="payment-method-wrapper">
                    {paymentMethodDisplay}
                    {showCardOnlinePaymentLink && (
                        renderCardOnlinePaymentLink({ orderNumber, orderId: id })
                    )}
                    {onlineTransactionProcessText && isCardOnlineMethod && (
                        <p className="online-transaction-process">{onlineTransactionProcessText}</p>
                    )}
                </div>
            </div>

            <div className="order-info-label order-packing">Состояние груза</div>
            <div className="order-info-value order-packing">{packingStatusDisplay}</div>

            <div className="order-info-label order-delivery-method">Способ доставки</div>
            <div className="order-info-value order-delivery-method">
                {deliveryMethodDisplay}{allowCourierExtra && ' (экстра)'}
            </div>

            <div className="order-info-label order-invoice">Скачать счёт</div>
            <div className="order-info-value order-invoice">
                <OrderInvoiceButton orderId={id} />
            </div>
        </div>
    );
}

export function OrderCardStatusSummary({
    lastActivityAt,
    orderStatus,
    financialsState,
    lastFinancialsEventEntry
}) {
    const lastActivityDate = new Date(lastActivityAt)?.toLocaleString();

    const orderStatusConfig = ORDER_STATUS_CONFIG[orderStatus];
    const financialsStateConfig = FINANCIALS_STATE_CONFIG[financialsState];

    return (
        <div className="order-state-summary">
            <p className="current-state">
                {`Текущее состояние (от ${lastActivityDate}): `}
                <span className={cn('order-status-label', orderStatusConfig?.intent ?? '')}>
                    {orderStatusConfig?.label ?? NO_VALUE_LABEL}
                </span>
                {' / '}
                <span className={cn('financials-state-label', financialsStateConfig?.intent ?? '')}>
                    {financialsStateConfig?.label ?? NO_VALUE_LABEL}
                </span>
            </p>

            <OrderLastFinancialsEvent lastFinancialsEventEntry={lastFinancialsEventEntry} />
        </div>
    );
}

export function OrderLastFinancialsEvent({ lastFinancialsEventEntry, showDate = false }) {
    if (!lastFinancialsEventEntry) return null;

    const lastFinancialsEventConfig = FINANCIALS_EVENT_CONFIG[lastFinancialsEventEntry.event];

    return (
        <p className="last-financials-event">
            {'Последнее финансовое событие'}
            {showDate && ` (${new Date(lastFinancialsEventEntry.changedAt)?.toLocaleString()})`}
            {': '}
            <span className={cn(
                'last-financials-event-label',
                lastFinancialsEventConfig?.intent ?? ''
            )}>
                {lastFinancialsEventConfig?.label ?? NO_VALUE_LABEL}
            </span>
            {' на сумму '}
            <span className="last-financials-event-amount">
                {formatCurrency(lastFinancialsEventEntry.action.amount)}
            </span>
            {' руб.'}
        </p>
    );
}

export function OrderInvoiceButton({ orderId }) {
    const isUnmountedRef = useRef(false);
    const dispatch = useDispatch();

    const downloadInvoice = async () => {
        const fileData = await dispatch(sendOrderInvoicePdfRequest(orderId));
        if (isUnmountedRef.current) return;

        const { status, message, blob, filename } = fileData;
        logRequestStatus({ context: 'ORDER: LOAD INVOICE', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось скачать документ',
                message: 'Ошибка при скачивании счёта заказа.\nПодробности ошибки в консоли.'
            });
        } else {
            triggerFileDownload(blob, filename);
        }
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <button
            className="download-invoice-btn"
            onClick={downloadInvoice}
        >
            📥
        </button>
    );
}

export function OrderRefreshButton({
    orderId,
    viewMode = 'page', // page | list
    uiBlocked = false,
    refreshOrderState
}) {
    const [orderUpdating, setOrderUpdating] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useDispatch();

    const updateOrder = async () => {
        setOrderUpdating(true);

        const params = new URLSearchParams({ viewMode });
        const urlParams = params.toString();
        const responseData = await dispatch(sendOrderRequest(orderId, urlParams));
        if (isUnmountedRef.current) return;

        const { status, message, order } = responseData;
        logRequestStatus({ context: 'ORDER: LOAD SINGLE', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось обновить состояние заказа',
                message: 'Ошибка при попытке обновления данных заказа.\nПодробности ошибки в консоли.'
            });
        } else {
            refreshOrderState(orderId, order);
        }

        setOrderUpdating(false);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <button
            className="update-order-btn"
            onClick={updateOrder}
            disabled={uiBlocked || orderUpdating}
        >
            <span className="icon">🔄</span>
            Обновить
        </button>
    );
}
