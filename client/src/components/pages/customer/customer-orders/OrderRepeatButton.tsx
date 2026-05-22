import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderRepeatRequest } from '@/api/orderRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { openConfirmModal } from '@/services/modalConfirmService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderRepeatButtonProps {
    orderId: string;
    onLoading?: (val: boolean) => void;
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const LOG_CTX = 'ORDER: REPEAT';

export default function OrderRepeatButton({
    orderId,
    onLoading, // Внешний сеттер для индикации загрузки при запросе
    uiBlocked = false
}: IOrderRepeatButtonProps): JSX.Element {
    const totalCartItems = useAppSelector(state => state.cart.ids.length);
    const [orderRepeating, setOrderRepeating] = useState(false);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const cartPath = routeConfig.customerCart.paths[0];

    const repeatOrder = async (): Promise<void> => {
        // В корзине есть товары
        if (totalCartItems > 0) {
            const processOrderRepeating = async (): Promise<void> => {
                setOrderRepeating(true);
                onLoading?.(true);

                const { status, message } = await dispatch(sendOrderRepeatRequest(orderId));
                if (isUnmountedRef.current) return;
        
                logRequestStatus({ context: LOG_CTX, status, message });

                if (status !== REQUEST_STATUS.SUCCESS) {
                    setOrderRepeating(false);
                    onLoading?.(false);
                    throw new Error(message);
                }
            };

            const finalizeOrderRepeating = (): void => {
                if (isUnmountedRef.current) return;
                navigate(cartPath);
            };

            openConfirmModal({
                prompt: 'Корзина не пуста. Повторение заказа заменит текущее содержимое.\nПродолжить?',
                onConfirm: processOrderRepeating,
                onFinalize: finalizeOrderRepeating
            });

            return;
        }

        // В корзине нет товаров
        setOrderRepeating(true);
        onLoading?.(true);

        const { status, message } = await dispatch(sendOrderRepeatRequest(orderId));
        if (isUnmountedRef.current) return;

        logRequestStatus({ context: LOG_CTX, status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось повторить заказ',
                message: 'Ошибка при попытке повторить заказ.\nПодробности ошибки в консоли.',
                onClose: () => {
                    if (isUnmountedRef.current) return;
                    setOrderRepeating(false);
                    onLoading?.(false);
                }
            });
        } else {
            navigate(cartPath);
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
            className="repeat-order-btn"
            onClick={repeatOrder}
            disabled={uiBlocked || orderRepeating}
        >
            <span className="icon">🛒</span>
            Повторить заказ
        </button>
    );
}
