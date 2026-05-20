import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import FormFooter from '@/components/common/FormFooter.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendBulkProductUpdateRequest } from '@/api/productRequests.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import {
    getLockedStatuses,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue,
    getBoolValue
} from '@/helpers/formHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { UNSORTED_CATEGORY_SLUG, PRODUCT_UNITS } from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    SelectHTMLAttributes
} from 'react';
import type {
    TLeafCategories,
    IGetSubmitStatesResult,
    IFieldConfig,
    TFormStatus,
    TSubmitStates,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult,
    TProductPerformFormSubmission,
    TProductPerformFormSubmissionResult
} from '@/types/index.js';
import type { TEntityField, IBulkProductUpdateBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'product'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

interface IBulkProductFormProps {
    productIds: string[];
    allowedCategories: TLeafCategories;
    onSubmit: (performFormSubmission: TProductPerformFormSubmission) => Promise<void>;
    uiBlocked: boolean;
}

type TApiFormFields = {
    [K in keyof IBulkProductUpdateBody['formFields']]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, BAD_REQUEST, NOT_FOUND, UNCHANGED,
        NO_SELECTION, INVALID, ERROR, TIMEOUT, PARTIAL, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Сохранить';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Выбранные товары или связанные с ними ресурсы не найдены.',
            locked: false
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Товары не сохранены.',
            submitBtnLabel: actionLabel
        },
        [NO_SELECTION]: {
            ...base[NO_SELECTION],
            mainMessage: 'Товары не выбраны.',
            addMessage: 'Выберите хотя бы один товар, чтобы продолжить.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [PARTIAL]: {
            ...base[PARTIAL],
            addMessage: 'Не все товары были сохранены.',
            submitBtnLabel: 'Сохранено'
        },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Выбранные товары сохранены!',
            addMessage: 'Список товаров будет обновлён.',
            submitBtnLabel: 'Сохранено'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const getFieldConfigs = (allowedCategories: TLeafCategories) => {
    const initCategory = allowedCategories.find(cat => cat.slug === UNSORTED_CATEGORY_SLUG);

    const fieldConfigs = [
        {
            name: 'brand',
            label: 'Бренд',
            elem: 'input',
            type: 'text',
            defaultValue: '',
            placeholder: 'Укажите бренд товаров',
            autoComplete: 'off',
            trim: true,
            optional: true,
            enabled: false
        },
        {
            name: 'unit',
            label: 'Единица измерения',
            elem: 'select',
            options: PRODUCT_UNITS.map(unit => ({ value: unit, label: unit })),
            defaultValue: PRODUCT_UNITS[0],
            enabled: false
        },
        {
            name: 'discount',
            label: 'Уценка (%)',
            elem: 'input',
            type: 'number',
            step: 0.5,
            min: 0,
            max: 100,
            defaultValue: 0,
            enabled: false
        },
        {
            name: 'category',
            label: 'Категория товаров',
            elem: 'select',
            options: allowedCategories.map(cat => ({ value: cat.id, label: cat.name })),
            defaultValue: initCategory?.id ?? (allowedCategories[0]?.id || ''),
            enabled: false
        },
        {
            name: 'tags',
            label: 'Теги (через запятую)',
            elem: 'input',
            type: 'text',
            placeholder: 'Укажите общие теги',
            defaultValue: '',
            autoComplete: 'off',
            trim: true,
            optional: true,
            enabled: false
        },
        {
            name: 'isActive',
            label: 'Активность',
            elem: 'checkbox',
            checkboxLabel: 'Доступен для продажи',
            defaultValue: true
        }
    ] as const satisfies readonly IFieldConfig[];

    return extendFieldConfigs(fieldConfigs);
};

export default function BulkProductForm(
    { productIds, allowedCategories, onSubmit, uiBlocked }: IBulkProductFormProps
): JSX.Element {
    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(allowedCategories);
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);
        
        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [allowedCategories]);
    
    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        createInitialFieldsState<TFieldName>
    );

    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const isFormLocked = lockedStatuses.has(submitStatus) || uiBlocked;

    const toggleFieldEnable = (name: TFieldName): void => {
        dispatchFieldsState({
            type: 'ENABLE',
            payload: { name }
        });
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const checked = 'checked' in target ? target.checked : false;
        let processedValue: string | number | boolean | undefined;
        
        if (type === 'number' && value !== '') {
            processedValue = Number(value.replace(',', '.'))
        } else if (type === 'checkbox') {
            processedValue = checked;
        } else {
            processedValue = value;
        }

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IBulkProductUpdateBody['formFields']
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { enabled, value }]) => {
                if (!enabled) return acc;

                const validation = validationRules.product[name];

                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;

                const ruleCheck =
                    typeof validation === 'function'
                        ? validation(normalizedValue)
                        : typeof normalizedValue === 'string'
                            ? validation.test(normalizedValue)
                            : false;

                const hasValue = normalizedValue !== '';
                const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;
    
                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.product[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    (acc.formFields as TApiFormFields)[name] = normalizedValue;
                    acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
    
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IBulkProductUpdateBody['formFields'],
                changedFields: [] as TFieldName[]
            }
        );

        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!productIds.length) {
            return setSubmitStatus(FORM_STATUS.NO_SELECTION);
        }
        
        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (!changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        const performFormSubmission = async (): Promise<
            TProductPerformFormSubmissionResult | undefined
        > => {
            setSubmitStatus(FORM_STATUS.SENDING);
            dispatch(setNavigationLock(true));

            const responseData = await dispatch(sendBulkProductUpdateRequest({ productIds, formFields }));
            if (isUnmountedRef.current) return;

            const { status, message } = responseData;
            const LOG_CTX = 'PRODUCT: UPDATE BULK';

            switch (status) {
                case FORM_STATUS.UNAUTH:
                case FORM_STATUS.USER_GONE:
                case FORM_STATUS.DENIED:
                case FORM_STATUS.BAD_REQUEST:
                case FORM_STATUS.NO_SELECTION:
                case FORM_STATUS.NOT_FOUND:
                case FORM_STATUS.UNCHANGED:
                case FORM_STATUS.ERROR:
                case FORM_STATUS.TIMEOUT:
                    logRequestStatus({ context: LOG_CTX, status, message });
                    setSubmitStatus(status);
                    dispatch(setNavigationLock(false));
                    break;

                case FORM_STATUS.INVALID: {
                    const { fieldErrors } = responseData;
                    logRequestStatus({
                        context: LOG_CTX,
                        status,
                        message,
                        details: fieldErrors
                    });
    
                    const fieldsStateUpdates: TFieldsStateUpdates = {};
                    Object.entries(fieldErrors)
                        .forEach(([name, error]) => {
                            if (!isObjectKey(name, fieldConfigMap)) return;
                            fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                        });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
    
                    setSubmitStatus(status);
                    dispatch(setNavigationLock(false));
                    break;
                }
            
                case FORM_STATUS.PARTIAL:
                case FORM_STATUS.SUCCESS: {
                    const { updatedProducts } = responseData;
                    logRequestStatus({ context: LOG_CTX, status, message });

                    const fieldsStateUpdates: TFieldsStateUpdates = {};
                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    setSubmitStatus(status);

                    await new Promise<void>(resolve => {
                        setTimeout(() => {
                            if (isUnmountedRef.current) return;
    
                            dispatchFieldsState({
                                type: 'RESET',
                                payload: createInitialFieldsState<TFieldName>(fieldConfigs)
                            });
    
                            setSubmitStatus(FORM_STATUS.DEFAULT);
                            dispatch(setNavigationLock(false));
                            resolve();
                        }, SUCCESS_DELAY);
                    });
    
                    return { status, affectedProducts: updatedProducts };
                }
            
                default:
                    logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                    setSubmitStatus(FORM_STATUS.UNKNOWN);
                    dispatch(setNavigationLock(false));
                    break;
            }

            return { status };
        };

        onSubmit(performFormSubmission);
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);
    
    // Сброс состояния полей при изменении их конфигов
    useEffect(() => {
        setSubmitStatus(FORM_STATUS.DEFAULT);
        dispatchFieldsState({
            type: 'RESET',
            payload: createInitialFieldsState<TFieldName>(fieldConfigs)
        });
    }, [fieldConfigs]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <form className="bulk-product-form" onSubmit={handleFormSubmit} noValidate>
            <header className="form-header">
                <h2>Редактирование группы выбранных товаров</h2>
            </header>

            <div className="form-body">
                {fieldConfigs.map(({
                    name,
                    label,
                    elem,
                    type,
                    step,
                    min,
                    max,
                    options,
                    placeholder,
                    checkboxLabel,
                    autoComplete,
                    trim
                }) => {
                    const fieldId = `bulk-products-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                    const isEnabled = fieldsState[name]?.enabled;

                    const baseElemProps: TFieldElemProps = {
                        //id: fieldId, // id привязан к чекбоксу активации поля формы
                        name,
                        autoComplete,
                        onChange: handleFieldChange,
                        disabled: !isEnabled || isFormLocked,
                    };
    
                    const fieldElem = (() => {
                        if (elem === 'select') return (
                            <select
                                {...baseElemProps}
                                value={getStringValue(fieldsState[name]?.value)}
                            >
                                {options.map((option, idx) => (
                                    <option key={`${idx}-${option.value}`} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        );
                        
                        if (elem === 'checkbox') return (
                            <DesignedCheckbox
                                {...baseElemProps}
                                label={checkboxLabel}
                                checked={getBoolValue(fieldsState[name]?.value)}
                            />
                        );
                    
                        return (
                            <input
                                {...baseElemProps}
                                type={type}
                                step={step}
                                min={min}
                                max={max}
                                placeholder={placeholder}
                                value={getStringValue(fieldsState[name]?.value)}
                                onBlur={trim ? handleFieldBlur : undefined}
                            />
                        );
                    })();

                    return (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <div className="form-entry-checkbox-label">
                                <DesignedCheckbox
                                    id={fieldId}
                                    name={name}
                                    checked={isEnabled}
                                    onChange={() => toggleFieldEnable(name)}
                                    disabled={isFormLocked}
                                />

                                <label htmlFor={fieldId} className="form-entry-label">{label}:</label>
                            </div>

                            <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                {fieldElem}
                                
                                {fieldsState[name]?.error && (
                                    <span className="invalid-message">
                                        *{fieldsState[name].error}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <FormFooter
                submitStates={submitStates}
                submitStatus={submitStatus}
                uiBlocked={isFormLocked}
            />
        </form>
    );
}
