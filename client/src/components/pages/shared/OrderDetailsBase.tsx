import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cn from 'classnames';
import CardOnlinePaymentLink from '@/components/pages/customer/customer-orders/CardOnlinePaymentLink.jsx';
import OrderRepeatButton from '@/components/pages/customer/customer-orders/OrderRepeatButton.jsx';
import OrderManagementControls from '@/components/pages/admin/shared/OrderManagementControls.jsx';
import OrderManagementNotes from '@/components/pages/admin/shared/OrderManagementNotes.jsx';
import OrderDetailsSectionEditButton from '@/components/pages/admin/order-details-management/OrderDetailsSectionEditButton.jsx';
import OrderDetailsSectionFormCollapsible from '@/components/pages/admin/order-details-management/OrderDetailsSectionFormCollapsible.jsx';
import { OrderRefreshButton, OrderInvoiceButton } from '@/components/parts/OrderParts.jsx';
import OrderDetailsItems from './order-details-base/OrderDetailsItems.jsx';
import NotFound from '@/components/pages/NotFound.jsx';
import { useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { subscribeToOrderUpdates } from '@/components/sse/SseOrderManagement.jsx';
import { sendOrderRequest } from '@/api/orderRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { ORDER_DETAILS_EDIT_SECTION, NO_VALUE_LABEL, DATA_LOAD_STATUS } from '@/config/constants.js';
import {
    buildCustomerFullName,
    buildShippingAddressDisplay,
    getShippingCostDisplay
} from '@/services/orderService.js';
import { isFullOrderStatusEntry, isFullOrderFinancialsEntry } from '@/helpers/typeGuards.js';
import { parseRouteParams } from '@/helpers/routeHelpers.js';
import { logRequestStatus, logMissingProps } from '@/helpers/logHelpers.js';
import { formatCurrency } from '@/helpers/textHelpers.js';
import {
    applyDotNotationPatches,
    getLastFinancialsEventEntry,
    isEqualCurrency
} from '@shared/commonHelpers.js';
import {
    REQUEST_STATUS,
    ORDER_VIEW_MODE,
    DELIVERY_METHOD_OPTIONS,
    PAYMENT_METHOD,
    PAYMENT_METHOD_OPTIONS,
    TRANSACTION_TYPE_CONFIG,
    TRANSACTION_STATUS_CONFIG,
    ORDER_STATUS,
    ORDER_STATUS_CONFIG,
    ORDER_ACTIVE_STATUSES,
    ORDER_FINAL_STATUSES,
    FINANCIALS_STATE_CONFIG,
    FINANCIALS_EVENT_CONFIG
} from '@shared/constants.js';
import type { ReactNode, JSX, ComponentProps } from 'react';
import type {
    TDataLoadStatus,
    TOrderDetailsEditSection,
    IOrderItemsSubmitResult,
    IOrderItemsResponseResult
} from '@/types/index.js';
import type { IOrder, IOrderUpdateData } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderDetailsBaseProps {
    routeKey: 'adminOrderDetails' | 'customerOrderDetails';
    subscribeToUpdates?: boolean;
    renderHeaderContent: (orderNumber?: string) => ReactNode;
    renderManagementControls?: (props: ComponentProps<typeof OrderManagementControls>) => ReactNode;
    renderSectionEditButton?: (props: ComponentProps<typeof OrderDetailsSectionEditButton>) => ReactNode;
    renderSectionFormCollapsible?: (props: ComponentProps<typeof OrderDetailsSectionFormCollapsible>) => ReactNode;
    renderManagementNotes?: (props: ComponentProps<typeof OrderManagementNotes>) => ReactNode;
    renderCardOnlinePaymentLink?: (props: ComponentProps<typeof CardOnlinePaymentLink>) => ReactNode;
    renderOrderRefreshButton?: (props: ComponentProps<typeof OrderRefreshButton>) => ReactNode;
    renderOrderRepeatButton?: (props: ComponentProps<typeof OrderRepeatButton>) => ReactNode;
}

interface IOrderDetailsLoadStatusProps {
    loadStatus: TDataLoadStatus;
    onReload: () => void;
}

type TOrderDetailsMainProps = Pick<IOrderDetailsBaseProps, 
    | 'renderManagementControls'
    | 'renderSectionEditButton'
    | 'renderSectionFormCollapsible'
    | 'renderManagementNotes'
    | 'renderCardOnlinePaymentLink'
    | 'renderOrderRefreshButton'
    | 'renderOrderRepeatButton'
> & {
    order: IOrder | null;
    refreshOrderState: (orderId: string, refreshedOrder: IOrder) => void;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderDetailsBase({
    routeKey,
    subscribeToUpdates = false,
    renderHeaderContent,
    renderManagementControls,
    renderSectionEditButton,
    renderSectionFormCollapsible,
    renderManagementNotes,
    renderCardOnlinePaymentLink,
    renderOrderRefreshButton,
    renderOrderRepeatButton
}: IOrderDetailsBaseProps): JSX.Element {
    const [orderLoading, setOrderLoading] = useState(true);
    const [orderLoadError, setOrderLoadError] = useState(false);
    const [order, setOrder] = useState<IOrder | null>(null);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();
    const params = useParams();

    const { orderId, orderNumber } = parseRouteParams({ routeKey, params });
    
    if (!orderId || !orderNumber) return <NotFound />;

    const orderLoadStatus =
        orderLoading
            ? DATA_LOAD_STATUS.LOADING
            : orderLoadError
                ? DATA_LOAD_STATUS.ERROR
                : DATA_LOAD_STATUS.READY;

    const loadOrder = async (): Promise<void> => {
        setOrderLoadError(false);
        setOrderLoading(true);

        const params = new URLSearchParams({ viewMode: ORDER_VIEW_MODE.PAGE });
        const urlParams = params.toString();
        const responseData = await dispatch(sendOrderRequest(orderId, urlParams));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'ORDER: LOAD SINGLE', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setOrderLoadError(true);
        } else {
            const { order } = responseData;
            setOrder(order);

            const updatedUrl = routeConfig[routeKey]?.generatePath({
                orderId: order.id,
                orderNumber: order.orderNumber
            }) ?? '/';

            if (location.pathname !== updatedUrl) {
                navigate(updatedUrl, { replace: true });
            }
        }

        setOrderLoading(false);
    };

    const updateOrderState = (
        updatedOrderId: string,
        orderUpdateData: IOrderUpdateData = {}
    ): void => {
        if (!orderId || updatedOrderId !== orderId) return;
        
        const {
            orderPatches = [],
            newOrderStatusEntry,
            newFinancialsEventEntry,
            voidedFinancialsEventEntry,
            newAuditLogEntry
        } = orderUpdateData;

        if (
            !orderPatches.length &&
            !newOrderStatusEntry &&
            !newFinancialsEventEntry &&
            !voidedFinancialsEventEntry &&
            !newAuditLogEntry
        ) return;

        setOrder(prev => {
            const currentOrder = prev ?? {} as IOrder;

            // Обновление полей через дот-нотацию
            const updatedOrder: IOrder = {
                ...currentOrder,
                items: (currentOrder.items ?? []).map(item => ({ ...item }))
            };
            applyDotNotationPatches(updatedOrder, orderPatches);
    
            // Обновление записей в массивах историй
            if (newOrderStatusEntry) {
                updatedOrder.statusHistory = [
                    ...updatedOrder.statusHistory,
                    newOrderStatusEntry
                ];
            }
            if (newFinancialsEventEntry) {
                updatedOrder.financials = {
                    ...updatedOrder.financials,
                    eventHistory: [
                        ...updatedOrder.financials.eventHistory,
                        newFinancialsEventEntry
                    ]
                };
            }
            if (voidedFinancialsEventEntry) {
                updatedOrder.financials = {
                    ...updatedOrder.financials,
                    eventHistory: updatedOrder.financials.eventHistory.map(entry => {
                        if ('eventId' in entry && entry.eventId === voidedFinancialsEventEntry.eventId) {
                            return voidedFinancialsEventEntry;
                        }
                        return entry;
                    })
                };
            }
            if (newAuditLogEntry) {
                updatedOrder.auditLog = [
                    ...(updatedOrder.auditLog || []),
                    newAuditLogEntry
                ];
            }
    
            return updatedOrder;
        });
    };
    
    const refreshOrderState = (_orderId: string, refreshedOrder: IOrder): void => {
        setOrder(refreshedOrder);
    }

    // Стартовая загрузка заказа и очистка при размонтировании
    useEffect(() => {
        loadOrder();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Подписка на обновление данных заказа для админа
    useEffect(() => {
        if (!subscribeToUpdates) return;

        const unsubscribe = subscribeToOrderUpdates((orderUpdate) => {
            updateOrderState(orderUpdate.orderId, orderUpdate.orderUpdateData);
        });
        return unsubscribe;
    }, []);
    
    return (
        <div className="order-details-page">
            <header className="order-details-header">
                {renderHeaderContent(orderNumber)}
            </header>

            <OrderDetailsLoadStatus
                loadStatus={orderLoadStatus}
                onReload={loadOrder}
            />

            <OrderDetailsMain
                order={order}
                renderManagementControls={renderManagementControls}
                renderSectionEditButton={renderSectionEditButton}
                renderSectionFormCollapsible={renderSectionFormCollapsible}
                renderManagementNotes={renderManagementNotes}
                renderCardOnlinePaymentLink={renderCardOnlinePaymentLink}
                renderOrderRefreshButton={renderOrderRefreshButton}
                renderOrderRepeatButton={renderOrderRepeatButton}
                refreshOrderState={refreshOrderState}
            />
        </div>
    );
}

function OrderDetailsLoadStatus(
    { loadStatus, onReload }: IOrderDetailsLoadStatusProps
): JSX.Element | null {
    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div className="order-details-load-status">
                <p>
                    <span className="icon load">⏳</span>
                    Загрузка заказов...
                </p>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div className="order-details-load-status">
                <p>
                    <span className="icon error">❌</span>
                    Ошибка сервера. Детали заказа не доступны.
                </p>
                <button
                    className="reload-btn"
                    onClick={onReload}
                    aria-label="Перезагрузить детали заказа"
                >
                    Повторить
                </button>
            </div>
        );
    }

    return null;
}

function OrderDetailsMain({
    order,
    renderManagementControls,
    renderSectionEditButton,
    renderSectionFormCollapsible,
    renderManagementNotes,
    renderCardOnlinePaymentLink,
    renderOrderRefreshButton,
    renderOrderRepeatButton,
    refreshOrderState
}: TOrderDetailsMainProps): JSX.Element | null {
    if (!order) return null;
    
    const {
        id, orderNumber, confirmedAt, statusHistory: orderStatusHistory,
        totals, items: orderItemList, customerInfo, delivery, financials,
        customerComment, internalNote, auditLog
    } = order;
    const currentOrderStatusEntry = orderStatusHistory.at(-1);

    if (
        orderItemList == null ||
        customerInfo == null ||
        currentOrderStatusEntry == null ||
        !('subtotalAmount' in totals) ||
        !('totalSavings' in totals)
    ) {
        logMissingProps('OrderDetailsMain', {
            orderItemList,
            customerInfo,
            currentOrderStatusEntry,
            subtotalAmount: 'subtotalAmount' in totals ? totals.subtotalAmount : undefined,
            totalSavings: 'totalSavings' in totals ? totals.totalSavings : undefined
        });
        return null; 
    }

    const [expandedSectionForms, setExpandedSectionForms] = useState<
        Set<TOrderDetailsEditSection>
    >(new Set());
    const [isItemsSubmitting, setIsItemsSubmitting] = useState(false);
    const [itemsSubmitResult, setItemsSubmitResult] = useState<
        IOrderItemsSubmitResult | null
    >(null);
    const [itemsResponseResult, setItemsResponseResult] = useState<
        IOrderItemsResponseResult | null
    >(null);

    const { subtotalAmount, totalSavings, totalAmount } = totals;
    const {
        firstName, lastName, middleName, email, phone,
        customerId, login, registrationEmail
    } = customerInfo;
    const { deliveryMethod, allowCourierExtra, shippingAddress, shippingCost } = delivery;
    const {
        defaultPaymentMethod,
        state: financialsState,
        totalPaid,
        totalRefunded,
        eventHistory: financialsEventHistory
    } = financials;

    const confirmedDate = new Date(confirmedAt).toLocaleString();
    const lastFinancialsEventEntry = getLastFinancialsEventEntry(financialsEventHistory);

    const isActiveOrder = ORDER_ACTIVE_STATUSES.includes(currentOrderStatusEntry.status);
    const isOrderFinal = ORDER_FINAL_STATUSES.includes(currentOrderStatusEntry.status);
    const isConfirmedOrder = currentOrderStatusEntry.status === ORDER_STATUS.CONFIRMED;
    const isCompletedOrder = currentOrderStatusEntry.status === ORDER_STATUS.COMPLETED;
    const isCancelledOrder = currentOrderStatusEntry.status === ORDER_STATUS.CANCELLED;

    const currentOrderStatusConfig = ORDER_STATUS_CONFIG[currentOrderStatusEntry.status];
    const financialsStateConfig = FINANCIALS_STATE_CONFIG[financialsState];
    const lastFinancialsEventConfig = lastFinancialsEventEntry
        ? FINANCIALS_EVENT_CONFIG[lastFinancialsEventEntry.event]
        : null;

    const currentOrderStatusChangedDate =
        new Date(currentOrderStatusEntry.changedAt).toLocaleString();
    const lastFinancialsEventChangedDate = lastFinancialsEventEntry
        ? new Date(lastFinancialsEventEntry.changedAt).toLocaleString()
        : '';

    const netPaid = totalPaid - totalRefunded;
    const paymentBalance = netPaid - totalAmount;
    const isUnpaid = !isEqualCurrency(paymentBalance, 0) && paymentBalance < 0;

    const currentOnlineTransaction = financials.currentOnlineTransaction;

    const showCardOnlinePaymentLink =
        !!renderCardOnlinePaymentLink &&
        defaultPaymentMethod === PAYMENT_METHOD.CARD_ONLINE &&
        isActiveOrder &&
        isUnpaid &&
        !currentOnlineTransaction;

    const onlineOperationType = currentOnlineTransaction
        ? TRANSACTION_TYPE_CONFIG[currentOnlineTransaction.type]
        : null;
    const onlineProviders = currentOnlineTransaction?.providers;
    const onlineOperationStatus = currentOnlineTransaction?.status
        ? TRANSACTION_STATUS_CONFIG[currentOnlineTransaction.status]
        : null;
    const onlineConfirmationUrl = currentOnlineTransaction?.confirmationUrl;

    const formattedTotalPaid = formatCurrency(totalPaid);
    const formattedTotalAmount = formatCurrency(totalAmount);
    const formattedTotalRefunded = formatCurrency(totalRefunded);
    const formattedPaymentBalance = formatCurrency(paymentBalance);
    const formattedSubtotalAmount = formatCurrency(subtotalAmount);
    const formattedTotalSavings = formatCurrency(totalSavings);
    const formattedTotalAmountSummary = formatCurrency(totalAmount + (shippingCost ?? 0));
    const formattedOnlineTransactionAmount = currentOnlineTransaction?.amount !== undefined
        ? formatCurrency(currentOnlineTransaction.amount)
        : NO_VALUE_LABEL;

    const packingStatusDisplay =
        ORDER_STATUS_CONFIG[currentOrderStatusEntry.status]?.packingLabel ?? '';
    const paymentMethodDisplay =
        PAYMENT_METHOD_OPTIONS.find(opt => opt.value === defaultPaymentMethod)?.label ?? '';
    const deliveryMethodDisplay =
        DELIVERY_METHOD_OPTIONS.find(opt => opt.value === deliveryMethod)?.label ?? '';

    const customerFullName = buildCustomerFullName(firstName, lastName, middleName);
    const shippingAddressDisplay = buildShippingAddressDisplay(deliveryMethod, shippingAddress);
    const shippingCostDisplay = getShippingCostDisplay(shippingCost);

    const cancelledStatusHistoryEntry = orderStatusHistory.find(
        entry => entry.status === ORDER_STATUS.CANCELLED
    );
    const cancellationReason =
        cancelledStatusHistoryEntry && 'cancellationReason' in cancelledStatusHistoryEntry
            ? cancelledStatusHistoryEntry.cancellationReason
            : undefined;

    const toggleSectionFormExpansion = (section: TOrderDetailsEditSection): void => {
        setExpandedSectionForms(prev => {
            const newExpandedSet = new Set(prev);

            if (newExpandedSet.has(section)) {
                newExpandedSet.delete(section);
            } else {
                newExpandedSet.add(section);
            }

            return newExpandedSet;
        });
    };

    return (
        <article data-id={id} className="order-details-main">
            <div className={cn('order-details-sections', {
                'completed': isCompletedOrder,
                'cancelled': isCancelledOrder
            })}>
                {isActiveOrder && <span className="active-order-badge">⚡</span>}

                {renderManagementControls && (
                    <section data-section="management" className="order-details-section">
                        <header className="order-details-section-header">
                            <h3>Управление заказом</h3>
                        </header>

                        {renderManagementControls({
                            isActiveOrder,
                            orderId: id,
                            orderStatus: currentOrderStatusEntry.status,
                            orderStatusHistory: orderStatusHistory.filter(isFullOrderStatusEntry),
                            deliveryMethod,
                            allowCourierExtra,
                            shippingCost,
                            defaultPaymentMethod,
                            financialsState,
                            financialsEventHistory: financials.eventHistory.filter(
                                isFullOrderFinancialsEntry
                            ),
                            netPaid,
                            totalAmount,
                            internalNote,
                            auditLog
                        })}
                    </section>
                )}

                <section data-section="order" className="order-details-section">
                    <header className="order-details-section-header">
                        <h3>Информация о заказе</h3>
                    </header>

                    <div className="order-details-section-main">
                        <p>
                            <span className="label">Номер заказа: </span>
                            <span className="value">{orderNumber}</span>
                        </p>
                        <p>
                            <span className="label">Заказ оформлен: </span>
                            <span className="value">{confirmedDate}</span>
                        </p>
                        <p>
                            <span className="label">Товарных позиций: </span>
                            <span className="value">{orderItemList.length}</span>
                        </p>
                        <p>
                            <span className="label">Состояние груза: </span>
                            <span className="value">{packingStatusDisplay}</span>
                        </p>
                        <p>
                            <span className="label">Текущий статус: </span>
                            <span className="value">
                                {currentOrderStatusConfig?.label ?? NO_VALUE_LABEL}
                            </span>
                        </p>
                        <p>
                            <span className="label">Статус изменён: </span>
                            <span className="value">{currentOrderStatusChangedDate}</span>
                        </p>
                        {isActiveOrder && renderOrderRefreshButton && (
                            <p>
                                {renderOrderRefreshButton({
                                    orderId: id,
                                    viewMode: ORDER_VIEW_MODE.PAGE,
                                    refreshOrderState
                                })}
                            </p>
                        )}
                        {isOrderFinal && renderOrderRepeatButton && (
                            <p>
                                {renderOrderRepeatButton({ orderId: id })}
                            </p>
                        )}
                    </div>
                </section>

                <section data-section="payment" className="order-details-section">
                    <header className="order-details-section-header">
                        <h3>Информация об оплате</h3>

                        {isConfirmedOrder && renderSectionEditButton?.({
                            section: ORDER_DETAILS_EDIT_SECTION.PAYMENT,
                            isFormExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.PAYMENT),
                            toggleSectionFormExpansion
                        })}
                    </header>

                    {isConfirmedOrder && renderSectionFormCollapsible?.({
                        isExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.PAYMENT),
                        section: ORDER_DETAILS_EDIT_SECTION.PAYMENT,
                        order
                    })}

                    <div className="order-details-section-main">
                        <p>
                            <span className="label">Способ оплаты: </span>
                            <span className="value">{paymentMethodDisplay}</span>
                        </p>
                        <p>
                            <span className="label">Сумма к оплате: </span>
                            <span className="value">{formattedTotalAmount} руб.</span>
                        </p>
                        <p>
                            <span className="label">Всего оплачено: </span>
                            <span className="value">{formattedTotalPaid} руб.</span>
                        </p>
                        {totalRefunded > 0 && (
                            <p>
                                <span className="label">Всего возвращено: </span>
                                <span className="value">{formattedTotalRefunded} руб.</span>
                            </p>
                        )}
                        {!isCancelledOrder && (
                            <p>
                                <span className="label">Разница по оплате (баланс): </span>
                                <span className="value">{formattedPaymentBalance} руб.</span>
                            </p>
                        )}
                        <p>
                            <span className="label">Скачать счёт: </span>
                            <OrderInvoiceButton orderId={id} />
                        </p>
                        <p>
                            <span className="label">Текущее состояние: </span>
                            <span className="value">
                                {financialsStateConfig?.label ?? NO_VALUE_LABEL}
                            </span>
                        </p>
                        {lastFinancialsEventEntry && (
                            <>
                                <p>
                                    <span className="label">Последнее финансовое событие: </span>
                                    <span className="value">
                                        {lastFinancialsEventConfig?.label ?? NO_VALUE_LABEL}
                                        {' на сумму '}
                                        {formatCurrency(lastFinancialsEventEntry.action.amount)}
                                        {' руб.'}
                                    </span>
                                </p>
                                <p>
                                    <span className="label">Последнее событие зафиксировано: </span>
                                    <span className="value">{lastFinancialsEventChangedDate}</span>
                                </p>
                            </>
                        )}
                        {showCardOnlinePaymentLink && (
                            <p>
                                <span className="label">Оплата банковской картой: </span>
                                {renderCardOnlinePaymentLink({ orderNumber, orderId: id })}
                            </p>
                        )}
                        {currentOnlineTransaction && (
                            <div className="order-online-transaction">
                                <span className="label">Информация о текущей онлайн-транзакции: </span>
                                <ul className="value">
                                    <li>
                                        Тип операции:{' '}
                                        {onlineOperationType?.label ?? NO_VALUE_LABEL}
                                    </li>
                                    <li>
                                        Сумма:{' '}
                                        {formattedOnlineTransactionAmount} руб.
                                    </li>
                                    <li>
                                        {`Провайдер${(onlineProviders ?? []).length > 1 ? 'ы' : ''}: `}
                                        {onlineProviders?.join(', ').toUpperCase() || NO_VALUE_LABEL}
                                    </li>
                                    <li>
                                        Статус:{' '}
                                        {onlineOperationStatus?.label ?? NO_VALUE_LABEL}
                                    </li>
                                    {onlineConfirmationUrl && (
                                        <li>
                                            Ссылка подтверждения операции:{' '}
                                            <a href={onlineConfirmationUrl}>
                                                {onlineConfirmationUrl} ↗
                                            </a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>

                <section data-section="customer-info" className="order-details-section">
                    <header className="order-details-section-header">
                        <h3>Сведения о покупателе</h3>

                        {isConfirmedOrder && renderSectionEditButton?.({
                            section: ORDER_DETAILS_EDIT_SECTION.CUSTOMER_INFO,
                            isFormExpanded: expandedSectionForms.has(
                                ORDER_DETAILS_EDIT_SECTION.CUSTOMER_INFO
                            ),
                            toggleSectionFormExpansion
                        })}
                    </header>

                    {isConfirmedOrder && renderSectionFormCollapsible?.({
                        isExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.CUSTOMER_INFO),
                        section: ORDER_DETAILS_EDIT_SECTION.CUSTOMER_INFO,
                        order
                    })}

                    <div className="order-details-section-main">
                        {customerId && (
                            <p>
                                <span className="label">ID клиента: </span>
                                <span className="value">{customerId}</span>
                            </p>
                        )}
                        <p>
                            <span className="label">ФИО: </span>
                            <span className="value">{customerFullName}</span>
                        </p>
                        <p>
                            <span className="label">Логин: </span>
                            <span className="value">{login}</span>
                        </p>
                        <p>
                            <span className="label">
                                {`Email${
                                    registrationEmail !== email
                                        ? ' (заказ)'
                                        : ' (совпадает с указанным при регистрации)'
                                }: `}
                            </span>
                            <span className="value">{email}</span>
                        </p>
                        {registrationEmail !== email && (
                            <p>
                                <span className="label">Email (регистрация): </span>
                                <span className="value">{registrationEmail}</span>
                            </p>
                        )}
                        <p>
                            <span className="label">Телефон: </span>
                            <span className="value">{phone}</span>
                        </p>
                        {customerComment && (
                            <p>
                                <span className="label">Комментарий к заказу: </span>
                                <span className="value">"{customerComment}"</span>
                            </p>
                        )}
                    </div>
                </section>

                <section data-section="delivery" className="order-details-section">
                    <header className="order-details-section-header">
                        <h3>Информация о доставке</h3>

                        {isConfirmedOrder && renderSectionEditButton?.({
                            section: ORDER_DETAILS_EDIT_SECTION.DELIVERY,
                            isFormExpanded: expandedSectionForms.has(
                                ORDER_DETAILS_EDIT_SECTION.DELIVERY
                            ),
                            toggleSectionFormExpansion
                        })}
                    </header>

                    {isConfirmedOrder && renderSectionFormCollapsible?.({
                        isExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.DELIVERY),
                        section: ORDER_DETAILS_EDIT_SECTION.DELIVERY,
                        order
                    })}

                    <div className="order-details-section-main">
                        <p>
                            <span className="label">Метод доставки: </span>
                            <span className="value">
                                {deliveryMethodDisplay}{allowCourierExtra && ' (экстра)'}
                            </span>
                        </p>
                        <p>
                            <span className="label">Адрес: </span>
                            <span className="value">{shippingAddressDisplay}</span>
                        </p>
                        <p>
                            <span className="label">Стоимость доставки: </span>
                            <span className="value">{shippingCostDisplay}</span>
                        </p>
                    </div>
                </section>

                <section data-section="items" className="order-details-section">
                    <header className="order-details-section-header">
                        <h3>Содержимое заказа</h3>

                        {isConfirmedOrder && renderSectionEditButton?.({
                            section: ORDER_DETAILS_EDIT_SECTION.ITEMS,
                            isFormExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.ITEMS),
                            toggleSectionFormExpansion
                        })}
                    </header>

                    {isConfirmedOrder && renderSectionFormCollapsible?.({
                        isExpanded: expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.ITEMS),
                        section: ORDER_DETAILS_EDIT_SECTION.ITEMS,
                        order,
                        itemsSubmitResult,
                        setIsItemsSubmitting,
                        onItemsResponseResult: (
                            data: IOrderItemsResponseResult
                        ): void => setItemsResponseResult(data)
                    })}

                    <OrderDetailsItems
                        isEditMode={expandedSectionForms.has(ORDER_DETAILS_EDIT_SECTION.ITEMS)}
                        orderId={id}
                        orderItemList={orderItemList}
                        isItemsSubmitting={isItemsSubmitting}
                        itemsResponseResult={itemsResponseResult}
                        onItemsSubmitResult={
                            (data: IOrderItemsSubmitResult): void => setItemsSubmitResult(data)
                        }
                        clearItemsSubmitResult={(): void => setItemsSubmitResult(null)}
                        clearItemsResponseResult={(): void => setItemsResponseResult(null)}
                    />

                    <div className="order-details-items-summary">
                        <p className="total-order-items">
                            <span className="label-col">Количество позиций:</span>
                            <span className="value-col">{orderItemList.length}</span>
                        </p>
                        <p className="subtotal-amount">
                            <span className="label-col">Сумма заказа без скидки:</span>
                            <span className="value-col">{formattedSubtotalAmount} руб.</span>
                        </p>
                        <p className="total-savings">
                            <span className="label-col">Общая скидка:</span>
                            <span className="value-col">-{formattedTotalSavings} руб.</span>
                        </p>
                        <p className="total-amount">
                            <span className="label-col">Сумма заказа со скидкой:</span>
                            <span className="value-col">{formattedTotalAmount} руб.</span>
                        </p>
                        <p className="shipping-cost">
                            <span className="label-col">Стоимость доставки:</span>
                            <span className="value-col">{shippingCostDisplay}</span>
                        </p>
                        <p className="total-amount-summary">
                            <span className="label-col">Итого:</span>
                            <span className="value-col">{formattedTotalAmountSummary} руб.</span>
                        </p>
                    </div>
                </section>
            </div>

            {renderManagementNotes?.({
                customerComment,
                internalNote,
                cancellationReason,
                floating: true
            })}
        </article>
    );
}
