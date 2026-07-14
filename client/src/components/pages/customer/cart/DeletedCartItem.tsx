import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { CartItem } from '../Cart.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendCartItemRemoveRequest } from '@/api/cartRequests.js';
import { highlightText } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, ComponentProps } from 'react';
import type { ICartItemElemAnimationState } from '@/types/index.js';
import type { IProduct, ICartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CartItem>;

type TDeletedCartItemProps = Pick<ICartItem,
    | 'id'
> & Pick<IProduct,
    | 'sku'
> & Pick<TParentProps,
    | 'searchQuery'
    | 'cartClearing'
    | 'addCartItemInProgress'
    | 'removeCartItemInProgress'
    | 'checkoutInProgress'
> & {
    title: string;
    isAnimationActive: boolean;
    setAnimationState: (updater: ICartItemElemAnimationState) => void;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function DeletedCartItem({
    id,
    title,
    searchQuery,
    cartClearing,
    addCartItemInProgress,
    removeCartItemInProgress,
    checkoutInProgress,
    isAnimationActive,
    setAnimationState
}: TDeletedCartItemProps): JSX.Element {
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState(false);
    const [isStatusTextVisible, setIsStatusTextVisible] = useState(true);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const statusText =
        removing
            ? '⏳ Удаление...'
            : removeError
                ? '❌ Не удалось удалить товар... Попробуйте снова.'
                : '⚠️ Удалить эту позицию из корзины?';

    const isCartItemUiBlocked = isAnimationActive || removing || cartClearing || checkoutInProgress;

    const handleRemove = async (): Promise<void> => {
        setIsStatusTextVisible(true);
        setRemoveError(false);
        setRemoving(true);
        addCartItemInProgress(id);

        const { status, message } = await dispatch(sendCartItemRemoveRequest(id));
        if (isUnmountedRef.current) return;

        logRequestStatus({ context: 'CART: REMOVE ITEM', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setRemoveError(true);
        } else {
            setIsStatusTextVisible(false);
            setAnimationState({ active: true, reason: 'remove', phase: 'collapsing' });
        }

        setRemoving(false);
        removeCartItemInProgress(id);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div className="cart-item-deleted">
            <div className="cart-item-info">
                <strong>{highlightText(title, searchQuery)}</strong><br />
                <span className="cart-item-warning">
                    Этот товар был удалён из магазина и больше недоступен.
                </span>
            </div>

            <div className="cart-item-controls-box">
                <p className={cn('cart-item-status-text', {
                    'visible': isStatusTextVisible,
                    'error': removeError
                })}>
                    {statusText}
                </p>

                <div className="cart-item-buttons-box">
                    <button
                        className="remove-cart-item-btn"
                        onClick={handleRemove}
                        aria-label="Удалить товар из корзины"
                        disabled={isCartItemUiBlocked}
                    >
                        Удалить
                    </button>
                </div>
            </div>
            
        </div>
    );
}
