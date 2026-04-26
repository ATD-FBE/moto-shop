import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import CustomerTableRow from '../CustomerTableRow.jsx';
import CustomerDiscountForm from './customer-table-row-main/CustomerDiscountForm.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CustomerTableRow>;

type TCustomerTableRowMainProps = Pick<TParentProps,
    | 'customer'
    | 'uiBlocked'
    | 'onToggleSelection'
    | 'onToggleExpansion'
    | 'onUpdateDiscount'
    | 'onUpdateBanStatus'
> & {
    isHovered: boolean;
    isSelected: boolean;
    isExpanded: boolean;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableRowMain({
    customer,
    uiBlocked,
    isHovered,
    isSelected,
    isExpanded,
    onToggleSelection,
    onToggleExpansion,
    onUpdateDiscount,
    onUpdateBanStatus
}: TCustomerTableRowMainProps): JSX.Element {
    const [isEditingDiscount, setIsEditingDiscount] = useState(false);
    const isUnmountedRef = useRef(false);

    const { id, name, email, createdAt, discount, totalSpent, isBanned } = customer;

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div
            role="row"
            className={cn('table-row-main', { 'warning': isBanned }, { 'hovered': isHovered })}
        >
            <div role="cell" className="row-cell select">
                <div className="cell-label">Выбрать:</div>
                <div className="cell-content">
                    <DesignedCheckbox
                        checked={isSelected}
                        onChange={() => onToggleSelection(id)}
                        disabled={uiBlocked}
                    />
                </div>
            </div>
            <div role="cell" className="row-cell id">
                <div className="cell-label">ID:</div>
                <div className="cell-content">{id}</div>
            </div>
            <div role="cell" className="row-cell name">
                <div className="cell-label">Имя:</div>
                <div className="cell-content">{name}</div>
            </div>
            <div role="cell" className="row-cell email">
                <div className="cell-label">Email:</div>
                <div className="cell-content">{email}</div>
            </div>
            <div role="cell" className="row-cell reg-date">
                <div className="cell-label">Дата регистрации:</div>
                <div className="cell-content">
                    {new Date(createdAt).toLocaleDateString()}
                </div>
            </div>
            <div role="cell" className="row-cell discount">
                <div className="cell-label">Скидка:</div>
                <div className="cell-content">
                    {isEditingDiscount ? (
                        <CustomerDiscountForm
                            uiBlocked={uiBlocked}
                            customerId={id}
                            customerDiscount={discount}
                            onUpdateDiscount={onUpdateDiscount}
                            setIsEditingDiscount={setIsEditingDiscount}
                        />
                    ) : (
                        <>
                            {discount}%
                            <button
                                className={cn('edit-customer-discount-btn', { 'visible': isHovered })}
                                onClick={() => setIsEditingDiscount(true)}
                            >
                                🖉
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div role="cell" className="row-cell total-spent">
                <div className="cell-label">Сумма покупок:</div>
                <div className="cell-content">{totalSpent} руб.</div>
            </div>
            <div role="cell" className="row-cell orders">
                <div className="cell-label">Заказы:</div>
                <div className="cell-content">
                    <button
                        className={cn('customer-orders-btn', { 'enabled': isExpanded })}
                        onClick={() => onToggleExpansion(id)}
                    >
                        <span className="icon">{isExpanded ? '🔼' : '📄'}</span>
                        {isExpanded ? 'Скрыть заказы' : 'Показать заказы'}
                    </button>
                </div>
            </div>
            <div role="cell" className="row-cell ban">
                <div className="cell-label">Блокировка:</div>
                <div className="cell-content">
                    <button
                        className="customer-ban-status-btn"
                        onClick={() => onUpdateBanStatus(id, { newBanStatus: !isBanned })}
                        disabled={uiBlocked}
                    >
                        <span className={cn('icon', { 'banned': !isBanned })}>
                            {isBanned ? '🔓' : '🔒'}
                        </span>
                        {isBanned ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                </div>
            </div>
        </div>
    );
}
