import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import Collapsible from '@/components/common/Collapsible.jsx';
import Toolbar from '@/components/common/Toolbar.jsx';
import CartItemCard from './cart/CartItemCard.jsx';
import PendingRemovalCartItem from './cart/PendingRemovalCartItem.jsx';
import DeletedCartItem from './cart/DeletedCartItem.jsx';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import useMeasureMaxWidth from '@/hooks/useMeasureMaxWidth.js';
import {
    sendCartItemListRequest,
    sendCartClearRequest,
    sendCartWarningsFixRequest
} from '@/api/cartRequests.js';
import { sendOrderDraftCreateRequest } from '@/api/checkoutRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { DATA_LOAD_STATUS, SCREEN_SIZE } from '@/config/constants.js';
import { selectCartItemList, clearCart } from '@/redux/slices/cartSlice.js';
import { setLockedRoute } from '@/redux/slices/uiSlice.js';
import { applyCartState, refreshCartTotals, unsetCartItem } from '@/services/cartService.js';
import { formatCheckoutAdjustmentLogs } from '@/services/checkoutService.js';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { formatProductTitle, formatCurrency, pluralize } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { getAppliedDiscountData } from '@shared/commonHelpers.js';
import { MIN_ORDER_AMOUNT, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, RefObject, Dispatch, SetStateAction } from 'react';
import type { TDataLoadStatus, TScreenSize, ICartItemElemAnimationState } from '@/types/index.js';
import type {
    IInitialOrderItemSnapshot,
    ICartItem,
    IProduct,
    TProductSnapshot
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICartItemListProps {
    cartItemElemMapRef: RefObject<Record<string, HTMLLIElement>>;
    screenSize: TScreenSize;
    loadStatus: TDataLoadStatus;
    onReload: () => Promise<void>;
    cartItemList: ICartItem[];
    productMap: Record<string, IProduct>;
    customerDiscount: number;
    filteredCartItemIdsSet: Set<string>;
    checkAllCartItemElemsCollapsed: () => boolean;
    showCartClearAnimation: boolean;
    setShowCartClearAnimation: Dispatch<SetStateAction<boolean>>;
    searchQuery: string;
    cartClearing: boolean;
    isTouchDevice: boolean;
    isAuthenticated: boolean;
    addCartItemInProgress: (id: string) => void;
    removeCartItemInProgress: (id: string) => void;
    checkoutInProgress: boolean;
}

type TCartItemProps = Pick<ICartItemListProps,
    | 'customerDiscount'
    | 'filteredCartItemIdsSet'
    | 'checkAllCartItemElemsCollapsed'
    | 'showCartClearAnimation'
    | 'setShowCartClearAnimation'
    | 'searchQuery'
    | 'cartClearing'
    | 'isTouchDevice'
    | 'isAuthenticated'
    | 'addCartItemInProgress'
    | 'removeCartItemInProgress'
    | 'checkoutInProgress'
> & {
    cartItemElemRef: (elem: HTMLLIElement) => void;
    cartItem: ICartItem;
    product: IProduct | TProductSnapshot;
    position: number;
    onCartItemVisibilityChange: (productId: string, isVisible: boolean) => void;
    pricesElemRef: (elem: HTMLDivElement) => void;
    totalsElemRef: (elem: HTMLDivElement) => void;
    maxPricesWidth: number;
    maxTotalsWidth: number;

};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function Cart(): JSX.Element | null {
    const { isTouchDevice, screenSize, isDashboardPanelActive } = useAppSelector(state => state.ui);
    const { isAuthenticated, user } = useAppSelector(state => state.auth);
    const cartItemList = useAppSelector(selectCartItemList);
    const {
        rawTotal: originalTotal,
        discountedTotal: currentTotal
    } = useAppSelector(state => state.cart);
    const productMap = useAppSelector(state => state.products.byId);

    const [initialized, setInitialized] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');

    const [cartLoading, setCartLoading] = useState(true);
    const [cartLoadError, setCartLoadError] = useState(false);
    const [cartItemIdsInProgress, setCartItemIdsInProgress] = useState<Set<string>>(new Set());
    const [checkoutInProgress, setCheckoutInProgress] = useState(false);
    const [cartClearing, setCartClearing] = useState(false);
    const [showCartClearAnimation, setShowCartClearAnimation] = useState(false);

    const cartItemElemMapRef = useRef<Record<string, HTMLLIElement>>({});
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const customerDiscount = user?.discount ?? 0;
    const totalCartItems = cartItemList.length;

    const savedTotal = originalTotal - currentTotal;
    const hasDiscount = savedTotal > 0;
    
    const formattedOriginalTotal = formatCurrency(originalTotal);
    const formattedCurrentTotal = formatCurrency(currentTotal);
    const formattedSavedTotal = formatCurrency(savedTotal);

    const cartLoadStatus =
        cartLoading
            ? DATA_LOAD_STATUS.LOADING
            : cartLoadError
                ? DATA_LOAD_STATUS.ERROR
                : !totalCartItems
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const isCartUiBlocked =
        cartLoading ||
        cartClearing ||
        showCartClearAnimation ||
        cartItemIdsInProgress.size > 0 ||
        checkoutInProgress;

    const { filteredCartItemIdsSet, cartWarningsCount } = useMemo(() => {
        let warningsCount = 0;

        const filteredCartItemIds = cartItemList.reduce<string[]>((acc, cartItem) => {
            const product = productMap[cartItem.id] ?? cartItem.productSnapshot;
            if (!product) return acc;

            // Фильтрация по поиску
            const searchLower = search?.trim().toLowerCase();
            
            const { name, brand } = product;
            const title = formatProductTitle(name, brand);

            const matchedStrings = [title];
            if (product._type === 'full' && product.sku) matchedStrings.push(product.sku);
    
            const matchesSearch = searchLower
                ? matchedStrings.some(str => str.toLowerCase().includes(searchLower))
                : true;
    
            // Фильтрация по проблемным товарам
            const isWarning =
                cartItem.quantityReduced ||
                cartItem.outOfStock ||
                cartItem.inactive ||
                cartItem.deleted;
            if (isWarning) warningsCount++;
    
            const matchesFilter = filter === 'warnings' ? isWarning : true;
    
            // Проверка фильтров
            if (matchesSearch && matchesFilter) {
                acc.push(cartItem.id);
            }
    
            return acc;
        }, []);
    
        return {
            filteredCartItemIdsSet: new Set(filteredCartItemIds),
            cartWarningsCount: warningsCount
        };
    }, [cartItemList, search, filter]);

    const filteredCartItemsCount = filteredCartItemIdsSet.size;

    const addCartItemInProgress = (id: string): void => {
        setCartItemIdsInProgress(prev => new Set(prev).add(id));
    };
      
    const removeCartItemInProgress = (id: string): void => {
        setCartItemIdsInProgress(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };

    const checkAllCartItemElemsCollapsed = (): boolean =>
        Object.values(cartItemElemMapRef.current).every(el => el.offsetHeight === 0);

    const loadCart = async (): Promise<void> => {
        setCartLoadError(false);
        setCartLoading(true);

        const responseData = await dispatch(sendCartItemListRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CART: LOAD', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setCartLoadError(true);
        } else {
            const { tradeProductList, cartItemList, customerDiscount } = responseData;
            dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));
        }

        setCartLoading(false);
    };

    const createOrderDraft = async (): Promise<void> => {
        if (!totalCartItems || cartLoadError) return;

        setCheckoutInProgress(true);

        // Создание снэпшотов критически важных данных черновика заказа для первой проверки изменений
        const initialOrderItemSnapshots: IInitialOrderItemSnapshot[] = cartItemList.map(item => {
            const product = productMap[item.id];
            const productDiscount = product?.discount ?? 0;
            const {
                appliedDiscount,
                appliedDiscountSource
            } = getAppliedDiscountData(productDiscount, customerDiscount);

            return {
                productId: item.id,
                priceSnapshot: product?.price ?? 0,
                appliedDiscountSnapshot: appliedDiscount,
                appliedDiscountSourceSnapshot: appliedDiscountSource
            };
        });

        const responseData = await dispatch(sendOrderDraftCreateRequest({ initialOrderItemSnapshots }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CHECKOUT: CREATE DRAFT ORDER', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            // Сумма заказа меньше минимальной
            if (status === REQUEST_STATUS.LIMITATION) {
                const {
                    tradeProductList,
                    cartItemList: newCartItemList, customerDiscount: newCustomerDiscount,
                    currentTotal, cartItemAdjustments
                } = responseData;

                dispatch(applyCartState(tradeProductList, newCartItemList, newCustomerDiscount));

                const amountToAdd = Math.max(0, MIN_ORDER_AMOUNT - currentTotal);
                const minOrderAmountMsg =
                    'Сумма заказа после синхронизации с текущими данными каталога ' +
                    'стала меньше минимальной.\n\n' +
                    'Минимальная сумма заказа — ' +
                    `<span className="color-blue">${formatCurrency(MIN_ORDER_AMOUNT)}</span> ₽. ` +
                    'Добавьте товаров ещё на ' +
                    `<span className="color-green">${formatCurrency(amountToAdd)}</span> ₽.`;
                    
                const adjustmentsMsg = cartItemAdjustments.length > 0
                    ? '\n\n\n<span className="bold underline">Изменения товаров в корзине:</span>' +
                        `\n\n${formatCheckoutAdjustmentLogs(cartItemAdjustments)}`
                    : '';
                
                openAlertModal({
                    type: 'error',
                    dismissible: false,
                    title: 'Сумма заказа меньше минимальной',
                    message: minOrderAmountMsg + adjustmentsMsg,
                    onClose: () => setCheckoutInProgress(false)
                });

                return;
            }
            
            // Ошибка сервера и др.
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось создать черновик заказа',
                message: 'Ошибка при оформлении заказа.\nПодробности ошибки в консоли.',
                onClose: () => setCheckoutInProgress(false)
            });
            return;
        }

        // Успешный ответ
        const {
            tradeProductList, cartItemList: newCartItemList, customerDiscount: newCustomerDiscount,
            orderId, cartItemAdjustments
        } = responseData;

        dispatch(applyCartState(tradeProductList, newCartItemList, newCustomerDiscount));

        const checkoutPath = routeConfig.customerCheckout.generatePath({ orderId });

        if (cartItemAdjustments.length > 0) {
            const adjustmentsMsg =
                '<span className="bold underline">Изменения товаров в корзине:</span>' +
                `\n\n${formatCheckoutAdjustmentLogs(cartItemAdjustments)}`;

            openAlertModal({
                type: 'warn',
                dismissible: false,
                title: 'Корзина была синхронизирована с текущими данными каталога',
                message: adjustmentsMsg,
                onClose: (): void => {
                    dispatch(setLockedRoute(checkoutPath));
                }
            });
        } else {
            dispatch(setLockedRoute(checkoutPath));
        }
    };

    const confirmCartClearing = async (): Promise<void> => {
        if (!totalCartItems || cartLoadError) return;

        const cartClearingPrompt =
            'Корзина товаров будет полностью очищена без возможности восстановления.\n' +
            'Продолжить выполнение?';

        const proccessCartClearing = async (): Promise<void> => {
            setCartClearing(true);
    
            const { status, message } = await dispatch(sendCartClearRequest());
            if (isUnmountedRef.current) return;
    
            logRequestStatus({ context: 'CART: CLEAR', status, message });
    
            if (status !== REQUEST_STATUS.SUCCESS) {
                setCartClearing(false);
                throw new Error(message);
            }
        };

        const finalizeCartClearing = (): void => {
            if (isUnmountedRef.current) return;
            
            setCartClearing(false);

            const allCollapsed = checkAllCartItemElemsCollapsed();

            if (allCollapsed) { // Очистка корзины сразу, т. к. все товары уже свёрнуты
                dispatch(clearCart());
            } else { // Включение флага для анимации сворачивания товаров (очистка корзины после)
                setShowCartClearAnimation(true);
            }
        };

        openConfirmModal({
            prompt: cartClearingPrompt,
            onConfirm: proccessCartClearing,
            onFinalize: finalizeCartClearing
        });
    };

    const fixCartWarnings = async (): Promise<void> => {
        setCartLoadError(false);
        setCartLoading(true);

        const responseData = await dispatch(sendCartWarningsFixRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CART: FIX', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setCartLoadError(true);
        } else {
            const { tradeProductList, cartItemList, customerDiscount } = responseData;
            dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));
        }

        setCartLoading(false);
    };

    const handleShowAllCartItems = (): void => {
        if (window.getSelection()?.toString()) return;
        setFilter('');
    };

    const showWarningCartItems = (): void => {
        if (isCartUiBlocked) return;
        if (window.getSelection()?.toString()) return;

        setFilter('warnings');

        // Очистка фокуса с уже неактивной ссылки, если он был
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    // Установка начальных значений параметров и очистка при размонтировании
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSearch(params.get('search') ?? '');
        setFilter(params.get('filter') === 'warnings' ? 'warnings' : '');

        setInitialized(true);

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Загрузка всех товаров корзины (после установки init-параметров)
    useEffect(() => {
        if (!initialized) return;
        loadCart(); // Не зависит от параметров, т. к. фильтрация клиентская
    }, [initialized]);

    // Обновление параметров
    useEffect(() => {
        if (!initialized) return;

        const params = new URLSearchParams({ search, filter });
        const urlParams = params.toString();

        if (location.search !== `?${urlParams}`) {
            const newUrl = `${location.pathname}?${urlParams}`;
            navigate(newUrl, { replace: true });
        }
    }, [initialized, search, filter]);

    // Сброс фильтра warnings, если проблемные товары устранены
    useEffect(() => {
        if (!initialized || cartLoadStatus !== DATA_LOAD_STATUS.READY || cartWarningsCount > 0) return;
        setFilter('');
    }, [initialized, cartLoadStatus, cartWarningsCount]);

    if (!initialized) return null;

    return (
        <div className="cart-page">
            <header className="cart-header">
                <h2>Корзина покупателя</h2>
                <p>Минимальная сумма заказа — {formatCurrency(MIN_ORDER_AMOUNT)} ₽</p>
            </header>

            <section className={cn(
                'cart-summary-wrapper',
                { 'dashboard-panel-active': isDashboardPanelActive }
            )}>
                <div className="cart-summary">
                    <div className="cart-totals">
                        <div className="cart-totals-title-box">
                            <p className="cart-totals-title">Итоговая сумма:</p>
                            <div className="cart-totals-info">
                                <p>Расчёт на момент посещения страницы.</p>
                                <p>Обновите данные для перерасчёта.</p>
                            </div>
                        </div>

                        <div className="cart-total-amounts">
                            {hasDiscount && (
                                <p className="cart-original-total" data-testid="cart-original-total">
                                    {formattedOriginalTotal} руб.
                                </p>
                            )}
                            <p className="cart-current-total" data-testid="cart-current-total">
                                {formattedCurrentTotal} руб.
                            </p>
                            {hasDiscount && (
                                <p className="cart-saved-total" data-testid="cart-saved-total">
                                    Экономия: {formattedSavedTotal} руб.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="cart-controls">
                        <button
                            className="update-cart-btn"
                            onClick={loadCart}
                            disabled={isCartUiBlocked}
                            aria-label="Обновить данные"
                        >
                            Обновить данные
                        </button>

                        <button
                            className="place-order-btn"
                            onClick={createOrderDraft}
                            disabled={isCartUiBlocked}
                            aria-label="Оформить заказ"
                        >
                            Начать оформление
                        </button>
                    </div>
                </div>
            </section>

            <section className="cart-main">
                <header className="cart-main-header">
                    <Toolbar
                        activeControls={['search']}
                        search={search}
                        setSearch={setSearch}
                        searchPlaceholder="По наименованию или артикулу товара"
                        uiBlocked={isCartUiBlocked}
                    />

                    <div className="cart-main-controls">
                        <div className="cart-main-info">
                            <p data-testid="prod-counter">
                                {'В корзине'}
                                &nbsp;
                                <span className="total-cart-items">{totalCartItems}</span>
                                &nbsp;
                                {pluralize(totalCartItems, [
                                    'товарная позиция',
                                    'товарные позиции',
                                    'товарных позиций'
                                ])}
                                {filteredCartItemsCount < totalCartItems && (
                                    <span>
                                        {' (показано '}
                                        <span className="filtered-cart-items-count">
                                            {filteredCartItemsCount}
                                        </span>
                                        {')'}
                                    </span>
                                )}
                                {cartWarningsCount > 0 && filter === 'warnings' && (
                                    <>
                                        :&nbsp;
                                        <button
                                            type="button"
                                            className="clear-filter-btn text-link-btn"
                                            disabled={isCartUiBlocked}
                                            onClick={handleShowAllCartItems}
                                            aria-label="Показать все товары"
                                        >
                                            Все товары
                                        </button>
                                    </>
                                )}
                            </p>

                            {cartWarningsCount > 0 && (
                                <p>
                                    <button
                                        type="button"
                                        tabIndex={filter === 'warnings' ? -1 : 0}
                                        className={cn('warning-cart-filter-btn', 'text-link-btn', {
                                            'active': filter === 'warnings'
                                        })}
                                        onClick={showWarningCartItems}
                                        disabled={isCartUiBlocked}
                                        aria-label="Показать проблемные товары"
                                    >
                                        <span className="warning-cart-items-count">
                                            {cartWarningsCount}
                                        </span>
                                        &nbsp;
                                        {pluralize(cartWarningsCount, [
                                            'позиция требует проверки',
                                            'позиции требуют проверки',
                                            'позиций требуют проверки'
                                        ])}
                                        :
                                    </button>
                                    
                                    <button
                                        type="button"
                                        className="fix-cart-items-btn"
                                        onClick={fixCartWarnings}
                                        disabled={isCartUiBlocked}
                                        title={'Очистка корзины от удалённых и недоступных товаров,' +
                                            ' автокоррекция количества товаров,' +
                                            ' которых осталось меньше.'}
                                        aria-label="Исправить все проблемные товары в корзине"
                                    >
                                        Исправить всё
                                    </button>
                                </p>
                            )}
                        </div>

                        <button
                            className="clear-cart-btn"
                            onClick={confirmCartClearing}
                            disabled={isCartUiBlocked}
                            aria-label="Очистить корзину"
                        >
                            Очистить корзину
                        </button>
                    </div>
                </header>

                <CartItemList
                    cartItemElemMapRef={cartItemElemMapRef}
                    screenSize={screenSize}
                    loadStatus={cartLoadStatus}
                    onReload={loadCart}
                    cartItemList={cartItemList}
                    productMap={productMap}
                    customerDiscount={customerDiscount}
                    filteredCartItemIdsSet={filteredCartItemIdsSet}
                    checkAllCartItemElemsCollapsed={checkAllCartItemElemsCollapsed}
                    showCartClearAnimation={showCartClearAnimation}
                    setShowCartClearAnimation={setShowCartClearAnimation}
                    searchQuery={search}
                    cartClearing={cartClearing}
                    isTouchDevice={isTouchDevice}
                    isAuthenticated={isAuthenticated}
                    addCartItemInProgress={addCartItemInProgress}
                    removeCartItemInProgress={removeCartItemInProgress}
                    checkoutInProgress={checkoutInProgress}
                />
            </section>
        </div>
    );
}

function CartItemList({
    cartItemElemMapRef,
    screenSize,
    loadStatus,
    onReload,
    cartItemList,
    productMap,
    customerDiscount,
    filteredCartItemIdsSet,
    checkAllCartItemElemsCollapsed,
    showCartClearAnimation,
    setShowCartClearAnimation,
    searchQuery,
    cartClearing,
    isTouchDevice,
    isAuthenticated,
    addCartItemInProgress,
    removeCartItemInProgress,
    checkoutInProgress
}: ICartItemListProps): JSX.Element {
    const [visibleCartItemMap, setVisibleCartItemMap] = useState<Record<string, boolean>>({});
    const pricesElemMapRef = useRef<Record<string, HTMLDivElement>>({});
    const totalsElemMapRef = useRef<Record<string, HTMLDivElement>>({});

    const assignRefInMap = <T extends HTMLElement>(
        elem: T | null,
        key: string,
        refMap: RefObject<Record<string, T>>
    ): void => {
        if (elem) {
            refMap.current[key] = elem;
        } else {
            delete refMap.current[key];
        }
    };

    const onCartItemVisibilityChange = (productId: string, isVisible: boolean): void => {
        setVisibleCartItemMap(prev => {
            if (prev[productId] === isVisible) return prev;
            return { ...prev, [productId]: isVisible };
        });
    };

    const visiblePricesContentElements = useMemo(() => {
        return Object.entries(pricesElemMapRef.current)
            .map(([id, el]) => (visibleCartItemMap[id] ? el : null))
            .filter((el): el is HTMLDivElement => Boolean(el));
    }, [visibleCartItemMap]);
    
    const visibleTotalsContentElements = useMemo(() => {
        return Object.entries(totalsElemMapRef.current)
            .map(([id, el]) => (visibleCartItemMap[id] ? el : null))
            .filter((el): el is HTMLDivElement => Boolean(el));
    }, [visibleCartItemMap]);

    // Расчёт максимальной ширины для колонок товара product-prices и product-total-amounts
    const maxPricesWidth = useMeasureMaxWidth(visiblePricesContentElements, {
        enabled:
            screenSize === SCREEN_SIZE.LARGE &&
            loadStatus === DATA_LOAD_STATUS.READY
    });
    const maxTotalsWidth = useMeasureMaxWidth(visibleTotalsContentElements, {
        enabled:
            [SCREEN_SIZE.MEDIUM, SCREEN_SIZE.LARGE].some(size => size === screenSize) &&
            loadStatus === DATA_LOAD_STATUS.READY
    });

    // Очистка рефов при обновлении данных корзины для пересчёта ширин контента
    useEffect(() => {
        if (loadStatus !== DATA_LOAD_STATUS.LOADING) return;
    
        pricesElemMapRef.current = {};
        totalsElemMapRef.current = {};
        setVisibleCartItemMap({});
    }, [loadStatus]);

    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div className="cart-load-status">
                <p>
                    <span className="icon load">⏳</span>
                    Загрузка товаров корзины...
                </p>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div className="cart-load-status">
                <p>
                    <span className="icon error">❌</span>
                    Ошибка сервера. Товары корзины не доступны.
                </p>
                <button className="reload-btn" onClick={onReload}>Повторить</button>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div className="cart-load-status">
                <p>
                    <span className="icon empty">🛒</span>
                    Корзина пуста. Товары отсутствуют.
                </p>
            </div>
        );
    }

    const allCollapsed = checkAllCartItemElemsCollapsed();
    const isSearchResultEmpty = !filteredCartItemIdsSet.size && allCollapsed;

    if (isSearchResultEmpty) {
        return (
            <div className="cart-load-status">
                <p>
                    <span className="icon not-found">🔎</span>
                    Товары не найдены - ни один из них не соответствует условиям поиска.
                </p>
            </div>
        );
    }

    return (
        <ul className="cart-item-list">
            {cartItemList.map((cartItem, idx) => {
                const productId = cartItem.id;
                const product = productMap[productId] ?? cartItem.productSnapshot;
                if (!product) return null;

                const cartItemElemRef = (elem: HTMLLIElement): void => {
                    assignRefInMap(elem, productId, cartItemElemMapRef);
                }
                const pricesElemRef = (elem: HTMLDivElement): void => {
                    assignRefInMap(elem, productId, pricesElemMapRef);
                }
                const totalsElemRef = (elem: HTMLDivElement): void => {
                    assignRefInMap(elem, productId, totalsElemMapRef);
                }

                return (
                    <CartItem
                        key={productId}
                        cartItemElemRef={cartItemElemRef}
                        cartItem={cartItem}
                        product={product}
                        customerDiscount={customerDiscount}
                        position={idx}
                        filteredCartItemIdsSet={filteredCartItemIdsSet}
                        checkAllCartItemElemsCollapsed={checkAllCartItemElemsCollapsed}
                        showCartClearAnimation={showCartClearAnimation}
                        setShowCartClearAnimation={setShowCartClearAnimation}
                        onCartItemVisibilityChange={onCartItemVisibilityChange}
                        pricesElemRef={pricesElemRef}
                        totalsElemRef={totalsElemRef}
                        maxPricesWidth={maxPricesWidth}
                        maxTotalsWidth={maxTotalsWidth}
                        searchQuery={searchQuery}
                        cartClearing={cartClearing}
                        isTouchDevice={isTouchDevice}
                        isAuthenticated={isAuthenticated}
                        addCartItemInProgress={addCartItemInProgress}
                        removeCartItemInProgress={removeCartItemInProgress}
                        checkoutInProgress={checkoutInProgress}
                    />
                );
            })}
        </ul>
    );
}

export const CartItem = ({
    cartItemElemRef,
    cartItem,
    product,
    customerDiscount,
    position,
    filteredCartItemIdsSet,
    checkAllCartItemElemsCollapsed,
    showCartClearAnimation,
    setShowCartClearAnimation,
    onCartItemVisibilityChange,
    pricesElemRef,
    totalsElemRef,
    maxPricesWidth,
    maxTotalsWidth,
    searchQuery,
    cartClearing,
    isTouchDevice,
    isAuthenticated,
    addCartItemInProgress,
    removeCartItemInProgress,
    checkoutInProgress
}: TCartItemProps): JSX.Element | null => {
    const [isPendingRemoval, setIsPendingRemoval] = useState(false);
    const [animationState, setAnimationState, animationStateRef] = useSyncedStateWithRef<
        ICartItemElemAnimationState
    >({
        active: true,
        reason: null,
        phase: 'expanding'
    });
    const [isHiddenByFilter, setIsHiddenByFilter] = useState(false);
    const dispatch = useAppDispatch();

    const isCartItemShown = 
        (!animationState.active || animationState.phase !== 'collapsing') &&
        !isHiddenByFilter &&
        !showCartClearAnimation;
    
    const showDeletedCartItem = isCartItemShown;
    const showPendingRemovalCartItem = isPendingRemoval && isCartItemShown;
    const showCartItem = !isPendingRemoval && isCartItemShown;

    const title = formatProductTitle(product.name, product.brand);

    const resetCartItemAnimation = (): void => {
        setAnimationState({ active: false, reason: null, phase: null });
    }

    const handleExpandEnd = (): void => {
        resetCartItemAnimation();
    };

    const handleCollapseEnd = (): void => {
        const animation = animationStateRef.current;

        switch (animation.reason) {
            case 'filtering':
                setIsHiddenByFilter(true);
                onCartItemVisibilityChange(cartItem.id, false);
                break;

            case 'pendingRemoval':
                onCartItemVisibilityChange(cartItem.id, false);
                break;
        
            case 'remove':
                dispatch(unsetCartItem(cartItem.id));
                dispatch(refreshCartTotals());
                break;
        
            case 'clearCart':
                const allCollapsed = checkAllCartItemElemsCollapsed();

                if (allCollapsed) {
                    dispatch(clearCart());
                    setShowCartClearAnimation(false);
                }
                break;
        
            default: // 'restore'
                break;
        }
        
        resetCartItemAnimation(); // Сброс работает для всех анимаций
    };

    // Включение видимости колонок для товара
    useEffect(() => {
        if (!showCartItem) return;
        onCartItemVisibilityChange(cartItem.id, true);
    }, [showCartItem]);

    // Установка анимации при фильтрации
    useEffect(() => {
        const isInFilteredList = filteredCartItemIdsSet.has(cartItem.id);

        const { active: animActive, reason: animReason } = animationState;
        const isFilterAnimation = animActive && animReason === 'filtering';
        const isRemoveAnimation = animActive && ['remove', 'clearCart'].some(r => r === animReason);

        if (isInFilteredList) {
            if (isFilterAnimation || isHiddenByFilter) {
                setIsHiddenByFilter(false);
                setAnimationState({ active: true, reason: null, phase: 'expanding' });
            }
        } else {
            if (!isFilterAnimation && !isRemoveAnimation) {
                setAnimationState({ active: true, reason: 'filtering', phase: 'collapsing' });
            }
        }
    }, [filteredCartItemIdsSet]);

    // Установка анимации схлопывания при очистке корзины
    useEffect(() => {
        if (!showCartClearAnimation) return;
        setAnimationState({ active: true, reason: 'clearCart', phase: 'collapsing' });
    }, [showCartClearAnimation]);

    if (cartItem.deleted) {
        return (
            <li ref={cartItemElemRef} className="cart-item">
                <Collapsible
                    isExpanded={showDeletedCartItem}
                    className="cart-item-card-collapsible"
                    showContextIndicator={false}
                    onExpandEnd={handleExpandEnd}
                    onCollapseEnd={handleCollapseEnd}
                >
                    <DeletedCartItem
                        id={cartItem.id}
                        title={title}
                        searchQuery={searchQuery}
                        cartClearing={cartClearing}
                        addCartItemInProgress={addCartItemInProgress}
                        removeCartItemInProgress={removeCartItemInProgress}
                        checkoutInProgress={checkoutInProgress}
                        isAnimationActive={animationState.active}
                        setAnimationState={setAnimationState}
                    />
                </Collapsible>
            </li>
        );
    }

    if (product._type === 'snapshot') return null;

    return (
        <li ref={cartItemElemRef} className="cart-item">
            <Collapsible
                isExpanded={showCartItem}
                className="cart-item-card-collapsible"
                showContextIndicator={false}
                onExpandEnd={handleExpandEnd}
                onCollapseEnd={handleCollapseEnd}
            >
                <CartItemCard
                    id={cartItem.id}
                    images={product.images}
                    mainImageIndex={product.mainImageIndex}
                    sku={product.sku}
                    title={title}
                    available={product.available}
                    unit={product.unit}
                    price={product.price}
                    productDiscount={product.discount}
                    customerDiscount={customerDiscount}
                    quantity={cartItem.quantity}
                    quantityReduced={cartItem.quantityReduced}
                    outOfStock={cartItem.outOfStock}
                    inactive={cartItem.inactive}
                    pricesElemRef={pricesElemRef}
                    totalsElemRef={totalsElemRef}
                    maxPricesWidth={maxPricesWidth}
                    maxTotalsWidth={maxTotalsWidth}
                    searchQuery={searchQuery}
                    cartClearing={cartClearing}
                    isTouchDevice={isTouchDevice}
                    isAuthenticated={isAuthenticated}
                    addCartItemInProgress={addCartItemInProgress}
                    removeCartItemInProgress={removeCartItemInProgress}
                    checkoutInProgress={checkoutInProgress}
                    isPendingRemoval={isPendingRemoval}
                    setIsPendingRemoval={setIsPendingRemoval}
                    isAnimationActive={animationState.active}
                    setAnimationState={setAnimationState}
                />
            </Collapsible>

            <Collapsible
                isExpanded={showPendingRemovalCartItem}
                className="cart-item-card-collapsible"
                showContextIndicator={false}
                onExpandEnd={handleExpandEnd}
                onCollapseEnd={handleCollapseEnd}
            >
                <PendingRemovalCartItem
                    id={cartItem.id}
                    sku={product.sku}
                    title={title}
                    quantity={cartItem.quantity}
                    position={position}
                    searchQuery={searchQuery}
                    cartClearing={cartClearing}
                    addCartItemInProgress={addCartItemInProgress}
                    removeCartItemInProgress={removeCartItemInProgress}
                    checkoutInProgress={checkoutInProgress}
                    isPendingRemoval={isPendingRemoval}
                    setIsPendingRemoval={setIsPendingRemoval}
                    isAnimationActive={animationState.active}
                    setAnimationState={setAnimationState}
                />
            </Collapsible>
        </li>
    );
}
