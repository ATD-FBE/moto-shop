import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { validationRules, fieldErrorMessages } from '@shared/fieldRules.js';
import { FIELD_UI_STATUS, SUCCESS_DELAY } from '@/config/constants.js';

// Конфиги и состояния полей общие для текущей строки (клиента)
// Обрабатывается ОДНО поле (каждое поле отправляется отдельной формой)
const getFieldConfigs = (customer, customerActions) => {
    const fieldConfigs = [
        {
            name: 'discount',
            elem: 'input',
            type: 'number',
            step: 1,
            min: 0,
            max: 100,
            defaultValue: customer.discount,
            onSubmit: customerActions.updateItemDiscount
        }
    ];

    const fieldConfigMap = fieldConfigs.reduce((acc, config) => {
        acc[config.name] = config;
        return acc;
    }, {});

    return { fieldConfigs, fieldConfigMap };
};

const initFieldsStateReducer = (fieldConfigs) =>
    fieldConfigs.reduce((acc, { name, defaultValue }) => {
        acc[name] = { value: defaultValue, uiStatus: '', error: '' };
        return acc;
    }, {});

const fieldsStateReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case 'UPDATE':
            const newState = { ...state };
            for (const name in payload) {
                newState[name] = { ...(state[name] ?? {}), ...payload[name] };
            }
            return newState;

        default:
            return state;
    }
};

export default function CustomerTableRowMain({
    customer,
    uiBlocked,
    isHovered,
    isSelected,
    isExpanded,
    toggleItemSelection,
    toggleItemExpansion,
    updateItemDiscount,
    toggleItemBanStatus
}) {
    const { fieldConfigs, fieldConfigMap } = useMemo(
        () => getFieldConfigs(customer, { updateItemDiscount }),
        [customer, updateItemDiscount]
    );
    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        initFieldsStateReducer
    );

    const [isEditingDiscount, setIsEditingDiscount] = useState(false);
    const isUnmountedRef = useRef(false);

    const { id, name, email, createdAt, discount, totalSpent, isBanned } = customer;

    const discountFieldCfg = fieldConfigMap.discount;
    const discountValue = fieldsState[discountFieldCfg.name]?.value;

    const cancelEditingField = (fieldCfg) => {
        setIsEditingDiscount(false);

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [fieldCfg.name]: { value: fieldCfg.defaultValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldChange = (e) => {
        const { type, name, value } = e.target;
        const processedValue = type === 'number' && value !== '' ? Number(value) : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const processFormField = (fieldCfg) => {
        const fieldsStateUpdates = {};
        let allValid = true;
        let changedField = '';
        let newValue;
      
        const { name, defaultValue, trim } = fieldCfg;
        const validation = validationRules.customer[name];

        if (!validation) {
            console.error(`Отсутствует правило валидации для поля: ${name}`);
            return { allValid, fieldsStateUpdates, newValue, changedField };
        }

        const value = fieldsState[name]?.value;
        const normalizedValue = trim ? value?.trim() : value;
        const ruleCheck =
            typeof validation === 'function'
                ? validation(normalizedValue)
                : validation.test(normalizedValue);

        const isValid = ruleCheck;

        fieldsStateUpdates[name] = {
            value: normalizedValue,
            uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
            error: isValid
                ? ''
                : fieldErrorMessages.customer[name].default || fieldErrorMessages.DEFAULT
        };

        if (isValid) {
            if (normalizedValue !== defaultValue) {
                newValue = normalizedValue;
                changedField = name;
            }
        } else {
            allValid = false;
        }
    
        return { allValid, fieldsStateUpdates, newValue, changedField };
    };

    const handleFormSubmit = async (e, fieldCfg) => {
        e.preventDefault();

        const { allValid, fieldsStateUpdates, newValue, changedField } = processFormField(fieldCfg);

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!allValid || !changedField) return;

        const submitResult = await fieldCfg.onSubmit(id, newValue);
        if (isUnmountedRef.current) return;
        if (!submitResult) return;

        const { success, fieldErrors, onComplete } = submitResult;

        if (!success) {
            if (fieldErrors) { // Обработка полей с ошибками
                const fieldsStateUpdates = {};
                Object.entries(fieldErrors).forEach(([name, error]) => {
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
            }
            onComplete();
        } else { // Обработка изменённых полей
            const fieldsStateUpdates = { [changedField]: { uiStatus: FIELD_UI_STATUS.CHANGED } };
            dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

            setTimeout(() => {
                if (isUnmountedRef.current) return;

                fieldsStateUpdates[changedField] = { uiStatus: '' };
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                onComplete();
            }, SUCCESS_DELAY);
        }
    };

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
                        onChange={() => toggleItemSelection(id)}
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
                        <form
                            className="discount-form"
                            onSubmit={(e) => handleFormSubmit(e, discountFieldCfg)}
                            noValidate
                        >
                            <div className={cn(
                                'form-field',
                                fieldsState[discountFieldCfg.name]?.uiStatus
                            )}>
                                <input
                                    name={discountFieldCfg.name}
                                    type={discountFieldCfg.type}
                                    step={discountFieldCfg.step}
                                    min={discountFieldCfg.min}
                                    max={discountFieldCfg.max}
                                    value={fieldsState[discountFieldCfg.name]?.value}
                                    onChange={handleFieldChange}
                                    disabled={uiBlocked}
                                />
                                {'%'}
                                <button
                                    className="submit-form-btn"
                                    type="submit"
                                    name="submit-button"
                                    disabled={
                                        uiBlocked ||
                                        discountValue === discountFieldCfg.defaultValue
                                    }
                                >
                                    ✔
                                </button>
                                <button
                                    className="cancel-editing-btn"
                                    type="button"
                                    name="cancel-button"
                                    onClick={() => cancelEditingField(discountFieldCfg)}
                                >
                                    ✖
                                </button>
                            </div>
                                
                            {fieldsState[discountFieldCfg.name]?.error && (
                                <p className="invalid-message">
                                    *{fieldsState[discountFieldCfg.name].error}
                                </p>
                            )}
                        </form>
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
                        onClick={() => toggleItemExpansion(id)}
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
                        onClick={() => toggleItemBanStatus(id, !isBanned)}
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
