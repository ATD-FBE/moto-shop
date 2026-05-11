import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { CartItem } from '../Cart.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendCartItemRestoreRequest } from '@/api/cartRequests.js';
import { refreshCartTotals, unsetCartItem } from '@/services/cartService.js';
import { highlightText } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, ComponentProps, Dispatch, SetStateAction } from 'react';
import type { ICartItemElemAnimationState } from '@/types/index.js';
import type { IProduct, ICartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CartItem>;

type TPendingRemovalCartItemProps = Pick<ICartItem,
    | 'id'
    | 'quantity'
> & Pick<IProduct,
    | 'sku'
> & Pick<TParentProps,
    | 'position'
    | 'searchQuery'
    | 'cartClearing'
    | 'addCartItemInProgress'
    | 'removeCartItemInProgress'
    | 'checkoutInProgress'
> & {
    title: string;
    isPendingRemoval: boolean;
    setIsPendingRemoval: Dispatch<SetStateAction<boolean>>;
    isAnimationActive: boolean;
    setAnimationState: (updater: ICartItemElemAnimationState) => void;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function PendingRemovalCartItem({
    id,
    sku,
    title,
    quantity,
    position,
    searchQuery,
    cartClearing,
    addCartItemInProgress,
    removeCartItemInProgress,
    checkoutInProgress,
    isPendingRemoval,
    setIsPendingRemoval,
    isAnimationActive,
    setAnimationState
}: TPendingRemovalCartItemProps): JSX.Element {
    const [restoring, setRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState(false);
    const [isStatusTextVisible, setIsStatusTextVisible] = useState(false);
    const [secondsLeftToRemove, setSecondsLeftToRemove] = useState(10);

    const removeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();

    const statusText =
        restoring
            ? '⏳ Восстановление...'
            : restoreError
                ? '❌ Не удалось восстановить товар... Попробуйте снова.'
                : `⏲ Удаление через ${secondsLeftToRemove} сек.`;

    const isCartItemUiBlocked =
        !isPendingRemoval ||
        isAnimationActive ||
        restoring ||
        cartClearing ||
        checkoutInProgress;

    const clearRemoveTimer = () => {
        clearTimeout(removeTimerRef.current);
        removeTimerRef.current = undefined;
    };
    
    const handleRestore = async (): Promise<void> => {
        clearRemoveTimer();
        setIsStatusTextVisible(true);
        setRestoreError(false);
        setRestoring(true);
        addCartItemInProgress(id);

        const { status, message } = await dispatch(sendCartItemRestoreRequest(id, {
            quantity,
            position
        }));
        if (isUnmountedRef.current) return;

        logRequestStatus({ context: 'CART: RESTORE ITEM', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setRestoreError(true);
        } else {
            setIsStatusTextVisible(false);
            setIsPendingRemoval(false);
            setAnimationState({ active: true, reason: 'restore', phase: 'transitioning' });
        }
        
        setRestoring(false);
        removeCartItemInProgress(id);
    };

    const handleRemove = (): void => {
        clearRemoveTimer();
        setIsStatusTextVisible(false);
        setAnimationState({ active: true, reason: 'remove', phase: 'collapsing' });
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;

            if (removeTimerRef.current) {
                clearRemoveTimer();
                dispatch(unsetCartItem(id));
                dispatch(refreshCartTotals());
            }
        };
    }, []);

    // Запуск таймера автоудаления
    useEffect(() => {
        if (!isPendingRemoval || isAnimationActive) return;
    
        setSecondsLeftToRemove(10);
        setIsStatusTextVisible(true);

        const tick = (): void => {
            setSecondsLeftToRemove(prev => {
                const next = prev - 1;

                // Задержка перед удалением товара
                if (next <= 0) {
                    removeTimerRef.current = setTimeout(handleRemove, 500);
                    return 0;
                }

                removeTimerRef.current = setTimeout(tick, 1000);
                return next;
            });
        };
        
        removeTimerRef.current = setTimeout(tick, 1000);

        return () => clearRemoveTimer();
    }, [isPendingRemoval, isAnimationActive]);

    // Остановка таймера при анимации или очистке корзины
    useEffect(() => {
        if (!isAnimationActive && !cartClearing) return;

        clearRemoveTimer();
        setIsStatusTextVisible(false);
    }, [isAnimationActive, cartClearing]);

    return (
        <div className="cart-item-pending-removal"> 
            <div className="cart-item-info">
                <strong>{highlightText(title, searchQuery)}</strong><br />
                {sku && (
                    <>
                        <small>Артикул: {highlightText(sku, searchQuery)}</small><br />
                    </>
                )}
                <span className="cart-item-warning">
                    Товар был удалён из корзины.
                    Вы можете восстановить его или удалить окончательно.
                </span>
            </div>

            <div className="cart-item-controls-box">
                <p className={cn('cart-item-status-text', {
                    'visible': isStatusTextVisible,
                    'error': restoreError
                })}>
                    {statusText}
                </p>

                <div className="cart-item-buttons-box">
                    <button
                        className="restore-cart-item-btn"
                        onClick={handleRestore}
                        disabled={isCartItemUiBlocked}
                        aria-label="Восстановить товар в корзине"
                    >
                        Восстановить
                    </button>

                    <button
                        className="remove-cart-item-btn"
                        onClick={handleRemove}
                        disabled={isCartItemUiBlocked}
                        aria-label="Удалить товар из корзины"
                    >
                        Удалить
                    </button>
                </div>
            </div>
            
        </div>
    );
}
