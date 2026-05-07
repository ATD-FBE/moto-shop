import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import CustomerTableRowMain from '../CustomerTableRowMain.jsx';
import {
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { FIELD_UI_STATUS, SUCCESS_DELAY } from '@/config/constants.js';
import type {
    JSX,
    ComponentProps,
    Dispatch,
    SetStateAction,
    ChangeEvent,
    SubmitEvent
} from 'react';
import type { TFieldStateValue, IFieldState, IProcessSingleFormFieldResult } from '@/types/index.js';
import type { TEntityField, ICustomerDiscountUpdateBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof CustomerTableRowMain>;

type TCustomerDiscountFormProps = Pick<TParentProps,
    | 'onUpdateDiscount'
    | 'uiBlocked'
> & {
    customerId: string;
    customerDiscount: number;
    setIsEditingDiscount: Dispatch<SetStateAction<boolean>>
};

type TFieldConfig = ReturnType<typeof getFieldConfig>;
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'customer'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TFormFields = {
    [K in keyof ICustomerDiscountUpdateBody]: TFieldStateValue;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getFieldConfig = (customerDiscount: number) => ({
    name: 'discount',
    elem: 'input',
    type: 'number',
    step: 1,
    min: 0,
    max: 100,
    defaultValue: customerDiscount
} as const);

export default function CustomerDiscountForm({
    uiBlocked,
    customerId,
    customerDiscount,
    onUpdateDiscount,
    setIsEditingDiscount
}: TCustomerDiscountFormProps): JSX.Element {
    const fieldConfig = useMemo(() => getFieldConfig(customerDiscount), [customerDiscount]);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        [fieldConfig],
        createInitialFieldsState<TFieldName>
    );
    const [updating, setUpdating] = useState(false);
    const isUnmountedRef = useRef(false);

    const fieldName = fieldConfig.name;
    const fieldValue = fieldsState[fieldName]?.value;

    const cancelEditingField = (
        fieldCfg: TFieldConfig,
        setter: Dispatch<SetStateAction<boolean>>
    ): void => {
        setter(false);

        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                [fieldCfg.name]: { value: fieldCfg.defaultValue ?? '', uiStatus: '', error: '' }
            }
        });
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const { name, type, value } = e.currentTarget;
        const processedValue = type === 'number' && value !== '' ? Number(value) : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const processFormFields = (): IProcessSingleFormFieldResult<
        TFieldName,
        ICustomerDiscountUpdateBody
    > => {
        const fieldsStateUpdates: TFieldsStateUpdates = {};
        const formFields = {} as ICustomerDiscountUpdateBody;

        const validation = validationRules.customer[fieldName];
        if (!validation) {
            console.error(`Отсутствует правило валидации для поля: ${fieldName}`);
            return { isValid: false, fieldsStateUpdates, formFields };
        }

        const defaultValue = fieldConfig?.defaultValue;
        const isValid = typeof validation === 'function' ? validation(fieldValue) : false;

        fieldsStateUpdates[fieldName] = {
            value: fieldValue,
            uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
            error: isValid
                ? ''
                : fieldErrorMessages.customer[fieldName].default || DEFAULT_FIELD_ERROR_MESSAGE
        };

        if (isValid) {
            if (fieldValue !== defaultValue) {
                (formFields as TFormFields)[fieldName] = fieldValue;
            }
        }

        return { isValid, fieldsStateUpdates, formFields };
    };

    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        const { isValid, fieldsStateUpdates, formFields } = processFormFields();

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!isValid || !Object.keys(formFields).length) return;

        setUpdating(true);

        const updateResult = await onUpdateDiscount(customerId, formFields);
        if (isUnmountedRef.current || !updateResult) return;

        const { success, fieldErrors, onComplete } = updateResult;

        if (!success) {
            // Обработка полей с ошибками
            const error = fieldErrors?.[fieldName];

            if (error) {
                dispatchFieldsState({
                    type: 'UPDATE',
                    payload: { [fieldName]: { uiStatus: FIELD_UI_STATUS.INVALID, error } }
                });
            }

            onComplete();
            setUpdating(false);
            return;
        }

        // Обработка изменённых полей
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [fieldName]: { uiStatus: FIELD_UI_STATUS.CHANGED } }
        });

        setTimeout(() => {
            if (isUnmountedRef.current) return;

            dispatchFieldsState({
                type: 'UPDATE',
                payload: { [fieldName]: { uiStatus: '' } }
            });

            onComplete();
            setUpdating(false);
        }, SUCCESS_DELAY);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <form
            className="customer-discount-form"
            onSubmit={(e) => handleFormSubmit(e)}
            noValidate
        >
            <div className={cn('form-field', fieldsState[fieldName]?.uiStatus)}>
                <input
                    name={fieldName}
                    type={fieldConfig.type}
                    step={fieldConfig.step}
                    min={fieldConfig.min}
                    max={fieldConfig.max}
                    value={getStringValue(fieldValue)}
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
                        fieldValue === fieldConfig.defaultValue
                    }
                >
                    ✔
                </button>
                <button
                    className="cancel-editing-btn"
                    type="button"
                    name="cancel-button"
                    onClick={() => cancelEditingField(fieldConfig, setIsEditingDiscount)}
                    disabled={updating}
                >
                    ✖
                </button>
            </div>
                
            {fieldsState[fieldName]?.error && (
                <p className="invalid-message">
                    *{fieldsState[fieldName].error}
                </p>
            )}
        </form>
    );
}
