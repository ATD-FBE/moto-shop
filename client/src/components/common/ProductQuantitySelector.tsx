import { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import useHoldAction from '@/hooks/useHoldAction.js';
import { sendCartItemUpdateRequest } from '@/api/cartRequests.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { setCartItem, unsetCartItem, refreshCartTotals } from '@/services/cartService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, Dispatch, SetStateAction, ChangeEvent } from 'react';
import type { IBaseCartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductQuantitySelectorProps {
    productId: string;
    availableQuantity: number;
    orderedQuantity: number;
    quantityReduced?: boolean;
    isTouchDevice?: boolean;
    isAuthenticated?: boolean;
    uiBlocked?: boolean;
    minQuantity?: number;
    onLoading?: Dispatch<SetStateAction<boolean>> | null;
}

interface IUpdateCartParams {
    cartItem: IBaseCartItem;
    isGuestCart: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProductQuantitySelector({
    productId,
    availableQuantity,
    orderedQuantity,
    quantityReduced = false,
    isTouchDevice = false,
    isAuthenticated = false,
    uiBlocked = false,
    minQuantity = 0,
    onLoading = null // Внешний сеттер для индикации загрузки при запросе
}: IProductQuantitySelectorProps): JSX.Element {
    const [quantity, setQuantity] = useState(String(Math.min(orderedQuantity, availableQuantity)));
    const [cartItemUpserting, setCartItemUpserting] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const getValidQuantity = (
        stringVal: string,
        currentQty: number,
        min: number,
        max: number
    ): number => {
        const numVal = Number(stringVal);
    
        if (!stringVal || isNaN(numVal)) return currentQty;
        if (numVal < min) return min;
        if (numVal > max) return max;
        return Math.round(numVal);
    };

    const validQty = getValidQuantity(quantity, orderedQuantity, minQuantity, availableQuantity);

    const addToCartBtnDisabled =
        uiBlocked ||
        cartItemUpserting ||
        (validQty === orderedQuantity && !quantityReduced);

    const { start: startIncrease, stop: stopIncrease } = useHoldAction(() => {
        setQuantity(prev => String(Math.min(availableQuantity, Number(prev) + 1)));
    });
    const { start: startDecrease, stop: stopDecrease } = useHoldAction(() => {
        setQuantity(prev => String(Math.max(minQuantity, Number(prev) - 1)));
    });

    const handleQuantityChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setQuantity(e.currentTarget.value);
    };
    const handleQuantityBlur = (): void => {
        setQuantity(String(validQty))
    };

    const updateCart = ({ cartItem, isGuestCart }: IUpdateCartParams): void => {
        if (cartItem.quantity > 0) {
            dispatch(setCartItem(cartItem, isGuestCart));
        } else {
            dispatch(unsetCartItem(cartItem.id, isGuestCart));
        }
        
        dispatch(refreshCartTotals());
    };

    const handleUpsertCartItem = async (): Promise<void> => {
        const cartItem: IBaseCartItem = { id: productId, quantity: validQty };
        
        if (isAuthenticated) {
            setCartItemUpserting(true);
            onLoading?.(true);

            const responseData = await dispatch(sendCartItemUpdateRequest(productId, {
                quantity: validQty
            }));
            if (isUnmountedRef.current) return;

            const { status, message } = responseData;

            logRequestStatus({ context: 'CART: UPSERT', status, message });

            if (status !== REQUEST_STATUS.SUCCESS) {
                dispatch(openAlertModal({
                    type: 'error',
                    dismissible: false,
                    title: 'Не удалось изменить количество товара в корзине',
                    message: 'Ошибка при обновлении количества товаров.\nПодробности ошибки в консоли.'
                }));
            } else {
                updateCart({ cartItem, isGuestCart: false });
            }

            setCartItemUpserting(false);
            onLoading?.(false);
        } else {
            updateCart({ cartItem, isGuestCart: true });
        }
    };
    
    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обработка нажатий на кнопки увеличения/уменьшения количества товара в корзине
    useEffect(() => {
        const handleRelease = (): void => {
            stopIncrease();
            stopDecrease();
        };
    
        window.addEventListener('mouseup', handleRelease);
        window.addEventListener('touchend', handleRelease);
    
        return () => {
            window.removeEventListener('mouseup', handleRelease);
            window.removeEventListener('touchend', handleRelease);
        };
    }, [stopIncrease, stopDecrease]);

    return (
        <div className="product-quantity-selector">
            {quantityReduced && (
                <p className="reduction-message">
                    <b>❗</b> Количество товара на складе уменьшилось
                </p>
            )}

            <div className="product-counter">
                <button
                    className="decrease-btn"
                    onMouseDown={isTouchDevice ? undefined : startDecrease}
                    onTouchStart={startDecrease}
                    disabled={uiBlocked || cartItemUpserting}
                >
                    −
                </button>
                <input
                    type="number"
                    className="quantity-input"
                    min={minQuantity}
                    max={availableQuantity}
                    value={quantity}
                    onChange={handleQuantityChange}
                    onBlur={handleQuantityBlur}
                    disabled={uiBlocked || cartItemUpserting}
                />
                <button
                    className="increase-btn"
                    onMouseDown={isTouchDevice ? undefined : startIncrease}
                    onTouchStart={startIncrease}
                    disabled={uiBlocked || cartItemUpserting}
                >
                    +
                </button>
            </div>

            <div className="add-to-cart-box">
                <button
                    className="add-to-cart-btn"
                    onClick={handleUpsertCartItem}
                    disabled={addToCartBtnDisabled}
                >
                    <span className="icon">🛒</span>
                    В корзину
                </button>

                {orderedQuantity > 0 && (
                    <div className="badge-box single-badge">
                        <span className="badge">{orderedQuantity}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
