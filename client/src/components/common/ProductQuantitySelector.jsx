import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useHoldAction from '@/hooks/useHoldAction.js';
import { sendCartItemUpdateRequest } from '@/api/cartRequests.js';
import { getValidQuantity } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { setCartItem, unsetCartItem, refreshCartTotals } from '@/services/cartService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { CLIENT_CONSTANTS } from '@shared/constants.js';

const { REQUEST_STATUS } = CLIENT_CONSTANTS;

export default function ProductQuantitySelector({
    id,
    availableQuantity,
    orderedQuantity,
    quantityReduced,
    isTouchDevice,
    isAuthenticated,
    uiBlocked = false,
    minQuantity = 0,
    onLoading = null // Внешний сеттер для индикации загрузки при запросе
}) {
    const [quantity, setQuantity] = useState(String(Math.min(orderedQuantity, availableQuantity)));
    const [productUpserting, setProductUpserting] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useDispatch();

    const validQty = getValidQuantity(quantity, minQuantity, availableQuantity);

    const addToCartBtnDisabled =
        uiBlocked ||
        productUpserting ||
        (validQty === orderedQuantity && !quantityReduced);

    const { start: startIncrease, stop: stopIncrease } = useHoldAction(() => {
        setQuantity(prev => String(Math.min(availableQuantity, Number(prev) + 1)));
    });
    const { start: startDecrease, stop: stopDecrease } = useHoldAction(() => {
        setQuantity(prev => String(Math.max(minQuantity, Number(prev) - 1)));
    });

    const handleQuantityChange = (e) => {
        setQuantity(e.target.value);
    };
    const handleQuantityBlur = () => {
        setQuantity(String(validQty))
    };

    const updateCart = ({ cartItem, isGuestCart }) => {
        if (cartItem.quantity > 0) {
            dispatch(setCartItem(cartItem, isGuestCart));
        } else {
            dispatch(unsetCartItem(cartItem.id, isGuestCart));
        }
        
        dispatch(refreshCartTotals());
    };

    const handleUpsertCartItem = async () => {
        const cartItem = { id, quantity: validQty };
        
        if (isAuthenticated) {
            setProductUpserting(true);
            onLoading?.(true);

            const cartItemData = { quantity: validQty };
            const responseData = await dispatch(sendCartItemUpdateRequest(id, cartItemData));
            if (isUnmountedRef.current) return;

            const { status, message } = responseData;

            logRequestStatus({ context: 'CART: UPSERT', status, message });

            if (status !== REQUEST_STATUS.SUCCESS) {
                setQuantity(String(Math.min(orderedQuantity, availableQuantity)));
                openAlertModal({
                    type: 'error',
                    dismissible: false,
                    title: 'Не удалось изменить количество товара в корзине',
                    message: 'Ошибка при обновлении количества товаров.\nПодробности ошибки в консоли.'
                });
            } else {
                updateCart({ cartItem, isGuestCart: false });
            }

            setProductUpserting(false);
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
        const handleRelease = () => {
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
                    disabled={uiBlocked || productUpserting}
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
                    disabled={uiBlocked || productUpserting}
                />
                <button
                    className="increase-btn"
                    onMouseDown={isTouchDevice ? undefined : startIncrease}
                    onTouchStart={startIncrease}
                    disabled={uiBlocked || productUpserting}
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
