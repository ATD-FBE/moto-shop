import { useMemo, useReducer, useState, useRef, useEffect, createElement }  from 'react';
import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderStatusUpdateRequest } from '@/api/orderRequests.js';
import { FIELD_UI_STATUS } from '@/config/constants.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import {
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { getOrderStatusSteps, isEqualCurrency, isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    MIN_ORDER_AMOUNT,
    REQUEST_STATUS,
    INTENT,
    DELIVERY_METHOD,
    ORDER_STATUS,
    ORDER_ACTIVE_STATUSES,
    ORDER_ACTION
} from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    TextareaHTMLAttributes
} from 'react';
import type { TFieldApiValue, IFieldState, IProcessFormFieldsResult } from '@/types/index.js';
import type {
    TEntityField,
    TDeliveryMethod,
    TOrderStatus,
    IOrderStatusUpdateBody,
    TIntent,
    TOrderAction
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'order'>>;

interface IOrderStatusStepsProps {
    orderId: string;
    currentOrderStatus: TOrderStatus;
    lastActiveOrderStatus?: TOrderStatus;
    deliveryMethod: TDeliveryMethod;
    allowCourierExtra?: boolean;
    shippingCost?: number | null;
    netPaid: number;
    totalAmount: number;
}

interface IHandleFormSubmitParams {
    newStatus?: TOrderStatus;
    rollback?: boolean;
}

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof NonNullable<IOrderStatusUpdateBody['formFields']>]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> & 
    TextareaHTMLAttributes<HTMLTextAreaElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const fieldConfigs = extendFieldConfigs([
    {
        name: 'shippingCost',
        label: 'Стоимость доставки',
        elem: 'input',
        type: 'number',
        step: 0.01,
        min: 0,
        canApply: ({ stepStatus, deliveryMethod, allowCourierExtra } : {
            stepStatus: TOrderStatus;
            deliveryMethod: TDeliveryMethod;
            allowCourierExtra?: boolean;
        }): boolean =>
            stepStatus === ORDER_STATUS.DELIVERED &&
            (
                deliveryMethod === DELIVERY_METHOD.TRANSPORT_COMPANY ||
                (deliveryMethod === DELIVERY_METHOD.COURIER && allowCourierExtra === true)
            )
    },
    {
        name: 'cancellationReason',
        label: 'Причина отмены',
        elem: 'textarea',
        placeholder: 'Укажите причину отмены заказа',
        trim: true,
        canApply: ({ stepStatus }: { stepStatus: TOrderStatus }): boolean =>
            stepStatus === ORDER_STATUS.CANCELLED
    }
] as const);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function OrderStatusSteps({
    orderId,
    currentOrderStatus,
    lastActiveOrderStatus,
    deliveryMethod,
    allowCourierExtra,
    shippingCost,
    netPaid,
    totalAmount
}: IOrderStatusStepsProps): JSX.Element {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [orderStatusLoading, setOrderStatusLoading] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const orderStatusSteps = useMemo(() => getOrderStatusSteps(deliveryMethod), [deliveryMethod]);

    const nextStepIdx = useMemo(() => {
        const idx = orderStatusSteps.findIndex(step => step.status === currentOrderStatus);
        return idx >= 0 ? idx + 1 : 0;
    }, [orderStatusSteps, currentOrderStatus]);
    
    // Индекс последнего активного шага для галочек при отмене заказа
    const lastActiveStatusStepIdx = useMemo(() => {
        if (currentOrderStatus !== ORDER_STATUS.CANCELLED) return nextStepIdx - 1;
        if (!lastActiveOrderStatus) return 0;
    
        const stepIdx = orderStatusSteps.findIndex(cfg => cfg.status === lastActiveOrderStatus);
        return Math.max(stepIdx, 0);
    }, [currentOrderStatus, lastActiveOrderStatus, orderStatusSteps, nextStepIdx]);

    const stepsGridClassName = deliveryMethod === DELIVERY_METHOD.SELF_PICKUP
        ? 'grid-pickup'
        : 'grid-delivery';

    const isStepFormVisible = (stepStatus: TOrderStatus, stepIdx: number): boolean => {
        // Если заказ завершён — никаких кнопок
        if (currentOrderStatus === ORDER_STATUS.COMPLETED) return false;

        // Кнопка для отмены только если заказ ещё не отменён
        if (stepStatus === ORDER_STATUS.CANCELLED && currentOrderStatus !== ORDER_STATUS.CANCELLED) {
            return true;
        }

        // Обычные кнопки действий для следующего шага
        return stepIdx === nextStepIdx;
    };

    const isRollbackFormVisible = (stepIdx: number): boolean =>
        ORDER_ACTIVE_STATUSES.some(s => s === currentOrderStatus) &&
        (orderStatusSteps[stepIdx - 1]?.rollbackAllowed ?? false);

    const isUpdateOrderStatusBtnDisabled = (stepStatus: TOrderStatus): boolean =>
        orderStatusLoading ||
        (
            stepStatus === ORDER_STATUS.COMPLETED &&
            !isEqualCurrency(netPaid, totalAmount) &&
            netPaid < totalAmount
        ) ||
        (
            stepStatus !== ORDER_STATUS.CANCELLED &&
            totalAmount < MIN_ORDER_AMOUNT
        );

    const isRollbackOrderStatusBtnDisabled = (stepIdx: number): boolean =>
        orderStatusLoading || stepIdx !== nextStepIdx;

    const getStepIntent = (stepStatus: TOrderStatus, stepIdx: number): TIntent => {
        if (stepStatus === ORDER_STATUS.CANCELLED) {
            if (currentOrderStatus === ORDER_STATUS.COMPLETED) return INTENT.NEUTRAL;
            return INTENT.NEGATIVE;
        }

        if (currentOrderStatus === ORDER_STATUS.CANCELLED) return INTENT.NEUTRAL;

        if (stepIdx < nextStepIdx) return INTENT.POSITIVE;
        if (stepIdx > nextStepIdx) return INTENT.NEUTRAL;
        return INTENT.HIGHLIGHT; // stepIdx === nextStepIdx
    };

    const getOrderStatusStepIcon = (stepStatus: TOrderStatus, stepIdx: number): string| null => {
        if (currentOrderStatus === ORDER_STATUS.CANCELLED) {
            if (stepStatus === ORDER_STATUS.CANCELLED) return '✅';
            if (stepIdx <= lastActiveStatusStepIdx) return '✅';
            return null;
        }
        if (stepIdx < nextStepIdx) return '✅';
        if (stepIdx > nextStepIdx) return '⋯';
        return null;
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, type, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const processedValue = type === 'number' && value !== ''
            ? Number(value.replace(',', '.'))
            : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (newStatus: TOrderStatus): IProcessFormFieldsResult<
        TFieldName,
        IOrderStatusUpdateBody['formFields']
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const fieldConfig = fieldConfigMap[name];
                if (!fieldConfig) return acc;

                const { trim, canApply } = fieldConfig;

                const isApplicable = canApply({
                    stepStatus: newStatus,
                    deliveryMethod,
                    allowCourierExtra
                });
                if (!isApplicable) return acc;

                const validation = validationRules.order[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const isValid =
                    typeof validation === 'function'
                        ? validation(normalizedValue)
                        : typeof normalizedValue === 'string'
                            ? validation.test(normalizedValue)
                            : false;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.order[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    (acc.formFields as TApiFormFields)[name] = normalizedValue;
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IOrderStatusUpdateBody['formFields']
            }
        );
    
        return result;
    };

    const handleFormSubmit = async (
        e: SubmitEvent<HTMLFormElement>,
        { newStatus = currentOrderStatus, rollback = false }: IHandleFormSubmitParams
    ): Promise<void> => {
        e.preventDefault();

        let formFields: IOrderStatusUpdateBody['formFields'] | undefined;
    
        if (!rollback) {
            const processed = processFormFields(newStatus);
            const { allValid, fieldsStateUpdates } = processed;
        
            dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
            if (!allValid) return;

            formFields = processed.formFields;
        }
    
        setOrderStatusLoading(true);
        dispatch(setNavigationLock(true));
    
        const action: TOrderAction =
            rollback
                ? ORDER_ACTION.ROLLBACK
                : newStatus === ORDER_STATUS.CANCELLED
                    ? ORDER_ACTION.CANCEL
                    : ORDER_ACTION.NEXT;
    
        const responseData = await dispatch(sendOrderStatusUpdateRequest(orderId, {
            action,
            ...(!rollback && formFields && Object.keys(formFields).length > 0 && { formFields })
        }));
        if (isUnmountedRef.current) return;
    
        const { status, message } = responseData;
    
        logRequestStatus({
            context: 'ORDER: STATUS UPDATE',
            status,
            message,
            ...('fieldErrors' in responseData && { details: responseData.fieldErrors })
        });
    
        if (status === REQUEST_STATUS.INVALID && !rollback) {
            const { fieldErrors } = responseData;
            const fieldsStateUpdates: TFieldsStateUpdates = {};
            Object.entries(fieldErrors).forEach(([name, error]) => {
                if (!isObjectKey(name, fieldConfigMap)) return;
                fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
            });
            dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        } else if (status !== REQUEST_STATUS.SUCCESS) {
            dispatch(openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось изменить статус заказа',
                message: 'Ошибка при изменении статуса заказа.\nПодробности ошибки в консоли.'
            }));
        }
    
        // Успешный ответ
        setOrderStatusLoading(false);
        dispatch(setNavigationLock(false));
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка дефолтного значения для поля shippingCost
    useEffect(() => {
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { shippingCost: { value: shippingCost ?? 0 } }
        });
    }, [shippingCost]);
    
    return (
        <div className={`order-status-steps ${stepsGridClassName}`}>
            {orderStatusSteps.map(({status, label, actionBtnLabel, className }, idx) => (
                <div
                    key={status}
                    className={cn('order-status-step', className, getStepIntent(status, idx))}
                >
                    <div className="order-status-step-header">
                        {status !== ORDER_STATUS.CANCELLED && (
                            <span className="order-status-step-number">{idx + 1}</span>
                        )}

                        <span className="order-status-step-label">{label}</span>

                        {isRollbackFormVisible(idx) && (
                            <form
                                className="order-status-form"
                                data-type="rollback"
                                onSubmit={(e) => handleFormSubmit(e, { rollback: true })}
                                noValidate
                            >
                                <button
                                    type="submit"
                                    name="submit-rollback-order-status-btn"
                                    className="rollback-order-status-btn"
                                    title="Откатить на предыдущий шаг"
                                    disabled={isRollbackOrderStatusBtnDisabled(idx)}
                                >
                                    ↩️
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="order-status-step-controls">
                        {isStepFormVisible(status, idx) ? (
                            <form
                                className="order-status-form"
                                data-type="change"
                                onSubmit={(e) => handleFormSubmit(e, { newStatus: status })}
                                noValidate
                            >
                                {fieldConfigs.map(({
                                    name,
                                    label,
                                    elem,
                                    type,
                                    step,
                                    min,
                                    placeholder,
                                    trim,
                                    canApply
                                }) => {
                                    const fieldId = `order-${orderId}-status-${toKebabCase(name)}`;
                                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                                    const isApplicable = canApply({
                                        stepStatus: status,
                                        deliveryMethod,
                                        allowCourierExtra
                                    });

                                    if (!isApplicable) return null;

                                    const elemProps: TFieldElemProps = {
                                        id: fieldId,
                                        name,
                                        type,
                                        step,
                                        min,
                                        placeholder,
                                        value: getStringValue(fieldsState[name]?.value),
                                        autoComplete: 'off',
                                        onChange: handleFieldChange,
                                        onBlur: trim ? handleFieldBlur : undefined,
                                        disabled: orderStatusLoading
                                    };

                                    return (
                                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                                            <label htmlFor={fieldId} className="form-entry-label">
                                                {label}:
                                            </label>

                                            <div className={cn(
                                                'form-entry-field',
                                                fieldsState[name]?.uiStatus
                                            )}>
                                                {createElement(elem, elemProps)}

                                                {fieldsState[name]?.error && (
                                                    <span className="invalid-message">
                                                        *{fieldsState[name].error}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                <button
                                    type="submit"
                                    name="submit-update-order-status-btn"
                                    className="update-order-status-btn"
                                    disabled={isUpdateOrderStatusBtnDisabled(status)}
                                >
                                    {actionBtnLabel}
                                </button>
                            </form>
                        ) : idx !== nextStepIdx && (
                            <span className="order-status-step-icon">
                                {getOrderStatusStepIcon(status, idx)}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
