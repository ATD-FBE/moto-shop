import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useNavigate, useParams, To } from 'react-router-dom';
import cn from 'classnames';
import CheckoutForm from './checkout/CheckoutForm.jsx';
import CheckoutSummary from './checkout/CheckoutSummary.jsx';
import OrderDraftExpirationTimer from './checkout/OrderDraftExpirationTimer.jsx';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { useStructureRefs } from '@/hooks/useStructureRefs.js';
import { sendOrderDraftSyncRequest, sendOrderDraftDeleteRequest } from '@/api/checkoutRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { FORM_STATUS, BASE_SUBMIT_STATES, SUCCESS_DELAY } from '@/config/constants.js';
import {
    setNavigationLock,
    setLockedRouteCancelPath,
    freezeLockedRouteCancel,
    clearLockedRoute
} from '@/redux/slices/uiSlice.js';
import { applyCartState } from '@/services/cartService.js';
import { formatCheckoutAdjustmentLogs } from '@/services/checkoutService.js';
import { openConfirmModal, closeConfirmModal } from '@/services/modalConfirmService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { getLockedStatuses } from '@/helpers/formHelpers.js';
import { formatCurrency } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { MIN_ORDER_AMOUNT } from '@shared/constants.js';
import type { JSX } from 'react';
import type { IGetSubmitStatesResult, TFormStatus, TSubmitStates } from '@/types/index.js';
import type { IOrderDraft } from '@shared/types/index.js';

const CHECKOUT_UI_LAYOUT_OFFSET = 6;

const getSubmitStates = (isCancelPath: boolean): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, LOADING, LOAD_ERROR, CANCELING, CANCEL_ERROR, CANCEL_SUCCESS, FORBIDDEN,
        BAD_REQUEST, NOT_FOUND, CONFLICT, LIMITATION, MODIFIED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const submitActionLabel = 'Оформить заказ';
    const cancelActionLabel = 'Отменить заказ';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: submitActionLabel, cancelBtnLabel: cancelActionLabel },
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка заказа...' },
        [LOAD_ERROR]: { ...base[LOAD_ERROR], mainMessage: 'Не удалось загрузить заказ.' },
        [CANCELING]: { ...base[CANCELING], mainMessage: 'Выполняется отмена заказа...' },
        [CANCEL_ERROR]: {
            ...base[CANCEL_ERROR],
            mainMessage: 'Не удалось отменить заказ.',
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [CANCEL_SUCCESS]: {
            ...base[CANCEL_SUCCESS],
            mainMessage: 'Заказ отменён!',
            addMessage: isCancelPath
                ? 'Вы будете перенаправлены на выбранную страницу.'
                : 'Вы будете перенаправлены на страницу корзины товаров.',
            cancelBtnLabel: 'Перенаправление...'
        },
        [FORBIDDEN]: {
            ...base[FORBIDDEN],
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [BAD_REQUEST]: {
            ...base[BAD_REQUEST],
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.',
            addMessage: 'Оформление невозможно.',
        },
        [CONFLICT]: {
            ...base[CONFLICT],
            mainMessage: 'Состав корзины и черновика заказа не совпадают.',
            addMessage: 'Заказ отменён.'
        },
        [LIMITATION]: {
            ...base[LIMITATION],
            mainMessage: 'Сумма заказа меньше минимальной.',
            addMessage: 'Заказ отменён.'
        },
        [MODIFIED]: {
            ...base[MODIFIED],
            mainMessage: 'Данные заказа изменились.',
            addMessage: 'Проверьте обновлённые позиции и подтвердите заказ снова.',
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [INVALID]: {
            ...base[INVALID],
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [ERROR]: {
            ...base[ERROR],
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [TIMEOUT]: {
            ...base[TIMEOUT],
            submitBtnLabel: submitActionLabel,
            cancelBtnLabel: cancelActionLabel
        },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Заказ успешно оформлен!',
            addMessage: 'Вы будете перенаправлены на страницу заказов.',
            submitBtnLabel: 'Перенаправление...'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

export default function Checkout(): JSX.Element | null {
    const user = useAppSelector(state => state.auth.user);
    const { lockedRoute, isDashboardPanelActive } = useAppSelector(state => state.ui);
    const productMap = useAppSelector(state => state.products.byId);

    const [frozenSubmitStates, setFrozenSubmitStates] = useState(() => getSubmitStates(false));
    const { submitStates, lockedStatuses } = frozenSubmitStates;

    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.LOADING);
    const [orderDraft, setOrderDraft] = useState<IOrderDraft | null>(null);

    const checkoutSidebarRef = useRef<HTMLElement | null>(null);
    const isUnmountedRef = useRef(false);

    const { orderId } = useParams();
    const { mainHeaderRef } = useStructureRefs();

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const cartPath = routeConfig.customerCart.paths[0];
    const cancelPath = lockedRoute?.cancelPath ?? null;

    const topStickyOffset = 
        (mainHeaderRef.current?.offsetHeight ?? 0) +
        (isDashboardPanelActive ? 0 : checkoutSidebarRef.current?.offsetHeight ?? 0) +
        CHECKOUT_UI_LAYOUT_OFFSET; // Дополнительный отступ сверху

    const loadOrderDraft = async (): Promise<void> => {
        if (!orderId) return;

        setSubmitStatus(FORM_STATUS.LOADING);

        const responseData = await dispatch(sendOrderDraftSyncRequest(orderId));
        if (isUnmountedRef.current) return;

        const {status, message } = responseData;
        logRequestStatus({ context: 'CHECKOUT: LOAD DRAFT', status, message });

        if (status !== FORM_STATUS.SUCCESS) {
            const finalStatus = lockedStatuses.has(status) ? status : FORM_STATUS.LOAD_ERROR;
            if (finalStatus === status) dispatch(clearLockedRoute()); // Закрытый статус

            if (status === FORM_STATUS.CONFLICT) { // Товары в корзине и заказе не совпадают
                const conflictMsg =
                    'Товары в корзине и черновике заказа не совпадают.\n' +
                    '<span className="color-red">Заказ отменён!</span> ' +
                    'Вы будете перенаправлены на страницу корзины.';

                openAlertModal({
                    openDelay: 1000,
                    type: 'error',
                    dismissible: false,
                    title: 'Произошла рассинхронизация',
                    message: conflictMsg,
                    dismissBtnLabel: 'Перейти в корзину',
                    onClose: () => {
                        dispatch(clearLockedRoute());
                        navigate(cartPath);
                    }
                });
            } else if (status === FORM_STATUS.LIMITATION) { // Сумма заказа меньше минимальной
                const {
                    tradeProductList, cartItemList, customerDiscount, orderDraft, orderItemAdjustments
                } = responseData;

                dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));

                const amountToAdd = Math.max(0, MIN_ORDER_AMOUNT - orderDraft.totals.totalAmount);
                const minOrderAmountMsg =
                    'Сумма заказа после синхронизации с текущими данными каталога ' +
                    'стала меньше минимальной.\n' +
                    '<span className="color-red">Заказ отменён!</span> ' +
                    'Вы будете перенаправлены на страницу корзины.\n\n' +
                    'Минимальная сумма заказа — ' +
                    `<span className="color-blue">${formatCurrency(MIN_ORDER_AMOUNT)}</span> ₽. ` +
                    'Добавьте товаров ещё на ' +
                    `<span className="color-green">${formatCurrency(amountToAdd)}</span> ₽.`;

                const adjustmentsMsg = orderItemAdjustments.length > 0
                    ? '\n\n\n<span className="bold underline">Изменения товаров в заказе:</span>' +
                        `\n\n${formatCheckoutAdjustmentLogs(orderItemAdjustments)}`
                    : '';

                openAlertModal({
                    openDelay: 1000,
                    type: 'error',
                    dismissible: false,
                    title: 'Сумма заказа меньше минимальной',
                    message: minOrderAmountMsg + adjustmentsMsg,
                    dismissBtnLabel: 'Перейти в корзину',
                    onClose: () => {
                        dispatch(clearLockedRoute());
                        navigate(cartPath);
                    }
                });
            }

            return setSubmitStatus(finalStatus);
        }

        // Успешный ответ
        const {
            tradeProductList, cartItemList, customerDiscount, orderDraft, orderItemAdjustments
        } = responseData;

        dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));
        setOrderDraft(orderDraft);
        setSubmitStatus(FORM_STATUS.DEFAULT);

        if (orderItemAdjustments.length > 0) {
            const adjustmentsMsg =
                '<span className="bold underline">Изменения товаров в заказе:</span>' +
                `\n\n${formatCheckoutAdjustmentLogs(orderItemAdjustments)}`;

            openAlertModal({
                openDelay: 1000,
                type: 'warn',
                dismissible: false,
                title: 'Заказ был синхронизирован с текущими данными каталога',
                message: adjustmentsMsg
            });
        }
    };

    const reloadOrderDraft = (): void => {
        loadOrderDraft();
    }

    const cancelOrderDraft = async (): Promise<void> => {
        if (!orderId) return;

        setSubmitStatus(FORM_STATUS.CANCELING);

        const responseData = await dispatch(sendOrderDraftDeleteRequest(orderId));
        if (isUnmountedRef.current) return;
    
        const {status, message } = responseData;
        logRequestStatus({ context: 'CHECKOUT: CANCEL', status, message });
    
        if (status !== FORM_STATUS.SUCCESS && status !== FORM_STATUS.NOT_FOUND) {
            const finalStatus = lockedStatuses.has(status) ? status : FORM_STATUS.CANCEL_ERROR;
            if (finalStatus === status) dispatch(clearLockedRoute()); // Закрытый статус
            setSubmitStatus(finalStatus);
            throw new Error(message);
        }
    
        dispatch(freezeLockedRouteCancel()); // Запрет новой установки пути для отмены
        setSubmitStatus(FORM_STATUS.CANCEL_SUCCESS);
    };

    const redirectOnCancelSuccess = (cancelPath?: To): void => {
        setTimeout(() => {
            if (isUnmountedRef.current) return;

            dispatch(clearLockedRoute());
            navigate(cancelPath ?? cartPath)
        }, SUCCESS_DELAY);
    };

    const cancelOrderDraftAndRedirect = async (): Promise<void> => {
        try {
            await cancelOrderDraft(); // Статус запроса не SUCCESS => редирект не выполнится
            redirectOnCancelSuccess();
        } catch {}
    };

    const handleDraftExpiration = (): void => {
        closeConfirmModal();
        cancelOrderDraftAndRedirect();
    };

    // Блокирование ссылок при первой загрузке страницы
    useLayoutEffect(() => {
        if (lockedRoute && location.pathname === lockedRoute.path) {
            dispatch(setNavigationLock(true));
        }
    }, [lockedRoute, location.pathname, dispatch]);

    // Стартовая загрузка заказа и очистка при размонтировании
    useEffect(() => {
        loadOrderDraft();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обновление конфигов состояния формы
    useEffect(() => {
        if (submitStatus === FORM_STATUS.CANCEL_SUCCESS) return; // Заморозка состояний формы при отмене
        setFrozenSubmitStates(getSubmitStates(Boolean(cancelPath)));
    }, [submitStatus, Boolean(cancelPath)]);

    // Попытка ухода со страницы
    useEffect(() => {
        if (!cancelPath) return; // Целевой путь отсутствует => выход
        if (lockedStatuses.has(submitStatus)) return; // Закрытый статус => выход

        // Показ модального окна подтверждения (с запросом на отмену заказа)
        openConfirmModal({
            dismissible: false,
            prompt: 'Вы точно хотите покинуть страницу оформления заказа?',
            confirmBtnLabel: 'Отменить заказ',
            cancelBtnLabel: 'Остаться',
            onConfirm: () => cancelOrderDraft(),
            onFinalize: () => redirectOnCancelSuccess(cancelPath),
            onCancel: () => dispatch(setLockedRouteCancelPath(null))
        });
    }, [cancelPath, submitStatus, openConfirmModal, dispatch]);

    if (!user || !orderId) return null;

    return (
        <div className="checkout-page">
            <header className="checkout-header">
                <h2>Оформление заказа</h2>
                <p>Просмотр сайта недоступен, пока заказ не будет оформлен или отменён.</p>
                <p>Товары в корзине резервируются на ограниченное время для оформления заказа.</p>
            </header>

            <div className="checkout-main">
                <CheckoutForm
                    orderId={orderId}
                    orderDraft={orderDraft}
                    setOrderDraft={setOrderDraft}
                    submitStates={submitStates}
                    lockedStatuses={lockedStatuses}
                    submitStatus={submitStatus}
                    setSubmitStatus={setSubmitStatus}
                    reloadOrderDraft={reloadOrderDraft}
                    topStickyOffset={topStickyOffset}
                    registrationEmail={user.email}
                    cartPath={cartPath}
                    productMap={productMap}
                />

                <aside
                    ref={checkoutSidebarRef}
                    className={cn(
                        'checkout-sidebar',
                        { 'dashboard-panel-active': isDashboardPanelActive }
                    )}
                >
                    <CheckoutSummary
                        orderTotals={orderDraft?.totals}
                    />

                    <div className="checkout-order-draft-panel">
                        <OrderDraftExpirationTimer
                            expirationTime={orderDraft?.expiresAt}
                            isCancelled={submitStatus === FORM_STATUS.CANCEL_SUCCESS}
                            onExpire={handleDraftExpiration}
                        />

                        <button
                            className="cancel-order-btn"
                            onClick={cancelOrderDraftAndRedirect}
                            disabled={lockedStatuses.has(submitStatus)}
                        >
                            {submitStates[submitStatus]?.cancelBtnLabel ?? ''}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
