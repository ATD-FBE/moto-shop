import { useState, useEffect } from 'react';
import type { JSX } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderDraftExpirationTimerProps {
    expirationTime?: string;
    isCancelled: boolean;
    onExpire: () => void;
}

interface IExpirationTimerData {
    isExpired: boolean;
    hours: string;
    minutes: string;
    seconds: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderDraftExpirationTimer(
    { expirationTime, isCancelled, onExpire }: IOrderDraftExpirationTimerProps
): JSX.Element {
    const calculateTimerData = (): IExpirationTimerData => {
        const expirationTimeNum = new Date(expirationTime ?? NaN).getTime();

        if (Number.isNaN(expirationTimeNum)) {
            return { isExpired: false, hours: '--', minutes: '--', seconds: '--' };
        }

        const timeDifference = expirationTimeNum - Date.now();

        if (timeDifference <= 0) {
            return { isExpired: true, hours: '00', minutes: '00', seconds: '00' };
        }
        
        return {
            isExpired: false,
            hours: String(Math.floor((timeDifference / (1000 * 60 * 60)) % 24)).padStart(2, '0'),
            minutes: String(Math.floor((timeDifference / 1000 / 60) % 60)).padStart(2, '0'),
            seconds: String(Math.floor((timeDifference / 1000) % 60)).padStart(2, '0')
        };
    };

    const [timerData, setTimerData] = useState(calculateTimerData);

    useEffect(() => {
        if (!expirationTime || isCancelled) return;

        // Первый тик таймера и проверка просрочки заказа
        const initTimerData = calculateTimerData();
        setTimerData(initTimerData);

        if (initTimerData.isExpired) {
            onExpire();
            return;
        }
    
        // Запуск таймера с проверкой просрочки заказа на каждой секунде
        const timer = setInterval(() => {
            const newTimerData = calculateTimerData();
            setTimerData(newTimerData);
    
            if (newTimerData.isExpired) {
                onExpire();
                clearInterval(timer);
            }
        }, 1000);
    
        // Очистка таймера при размонтировании компонента
        return () => clearInterval(timer);
    }, [expirationTime, isCancelled]);

    if (isCancelled) {
        return (
            <div className="order-draft-expiration-timer">
                <p className="timer-info">Заказ отменён.</p>
            </div>
        );
    }

    return (
        <div className="order-draft-expiration-timer">
            <p className="timer-info">Автоотмена через:</p>
            <p className="time-left-display">
                {timerData.hours}:{timerData.minutes}:{timerData.seconds}
            </p>
        </div>
    );
}
