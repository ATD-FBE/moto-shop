import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import { sendCategoryCreateRequest, sendCategoryUpdateRequest } from '@/api/categoryRequests.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import {
    NO_VALUE_LABEL,
    CATEGORY_FORM_MODE,
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS
} from '@/config/constants.js';
import {
    getLockedStatuses,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import type {
    IGetSubmitStatesResult,
    IFieldConfig,
    TFormStatus,
    TSubmitStates,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult,
    ICategoryFormCommonData,
    ICategoryEditFormData,
    TCategoryFormProps,
    TCategoryPerformFormSubmissionResult,
    TAppThunk
} from '@/types/index.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    SelectHTMLAttributes
} from 'react';
import type {
    TEntityField,
    ICategoryBody,
    TCategoryUpdateResponse,
    TCategoryCreateResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'category'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof ICategoryBody]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> & 
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (isEditMode: boolean): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, BAD_REQUEST, NOT_FOUND, UNCHANGED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = isEditMode ? 'Изменить' : 'Создать';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходная категория или связанный с ней ресурс не найден.'
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Категория не изменена.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: isEditMode ? 'Категория обновлена.' : 'Новая категория добавлена!',
            addMessage: 'Категории товаров будут обновлены.',
            submitBtnLabel: 'Выполнено'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const getFieldConfigs = (
    isEditMode: boolean,
    initValues: ICategoryFormCommonData['initValues'],
    defaultOrder: number | undefined,
    maxOrder: number,
    safeParentData: ICategoryEditFormData['safeParentData'] | undefined,
    parentName: string | undefined,
    isRestricted: boolean
) => {
    const fieldConfigs = [
        {
            name: 'name',
            label: 'Название',
            elem: 'input',
            type: 'text',
            defaultValue: initValues.name,
            placeholder: isEditMode ? 'Укажите новое название категории' : 'Укажите название категории',
            autoComplete: 'off',
            trim: true,
            lock: isRestricted && !isEditMode
        },
        {
            name: 'slug',
            label: 'URL-адрес',
            elem: 'input',
            type: 'text',
            defaultValue: initValues.slug,
            placeholder: isEditMode ? 'Укажите новый адрес категории' : 'Укажите адрес категории',
            autoComplete: 'off',
            trim: true,
            lock: isRestricted
        },
        {
            name: 'order',
            label: 'Порядковый номер',
            elem: 'input',
            type: 'number',
            defaultValue: (isEditMode ? initValues.order : (defaultOrder ?? 0)) + 1,
            min: 1,
            max: maxOrder + 1,
            lock: isRestricted && !isEditMode
        },
        {
            name: 'parent',
            label: 'Родительская категория',
            elem: isEditMode ? 'select' : 'output',
            options: isEditMode && safeParentData
                ? safeParentData.selectOptions.map(opt => ({ value: opt.id, label: opt.label }))
                : [],
            defaultValue: initValues.parent ?? '',
            outputValue: !isEditMode ? (parentName ?? NO_VALUE_LABEL) : undefined,
            lock: isRestricted
        }
    ] as const satisfies readonly IFieldConfig[];

    return extendFieldConfigs(fieldConfigs);
}

export default function CategoryForm(props: TCategoryFormProps<TFieldName>): JSX.Element {
    const {
        mode,
        categoryId, // В режиме edit может быть пустой строкой (категория не выбрана)
        initValues, // { name, slug, order, parent }
        maxOrder,
        isRestricted,
        onSubmit,
        uiBlocked
    } = props;

    const isEditMode = mode === CATEGORY_FORM_MODE.EDIT;

    const defaultOrder = !isEditMode ? props.defaultOrder : undefined;
    const parentName = !isEditMode ? props.parentName : undefined;
    const safeParentData = isEditMode ? props.safeParentData : undefined;

    const { submitStates, lockedStatuses } = useMemo(() => getSubmitStates(isEditMode), [isEditMode]);

    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(
            isEditMode, initValues, defaultOrder, maxOrder,
            safeParentData, parentName, isRestricted
        );
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);

        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [isEditMode, initValues, defaultOrder, maxOrder, safeParentData, parentName, isRestricted]);

    const initialStateOptions = useMemo(() => ({
        // Добавление дополнительного параметра в состояние для поля заказа
        extraStateFields: { order: ['max' as keyof TFieldConfig] }
    }), []);
    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        (configs) => createInitialFieldsState<TFieldName>(configs, initialStateOptions)
    );

    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const isFormLocked = lockedStatuses.has(submitStatus) || uiBlocked;

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { name, type, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const processedValue = type === 'number' && value !== '' ? Number(value) : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<TFieldName, ICategoryBody> => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.category[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const submittedValue =
                    name === 'order' && typeof normalizedValue === 'number'
                        ? normalizedValue - 1
                        : normalizedValue;

                const isValid = 
                    typeof validation === 'function'
                        ? validation(submittedValue)
                        : typeof submittedValue === 'string'
                            ? validation.test(submittedValue)
                            : false;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.category[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    (acc.formFields as TApiFormFields)[name] = submittedValue;
                    
                    const initValue = initValues[name];
                    const isValueChanged = isEditMode
                        ? submittedValue !== initValue
                        : name !== 'parent';
                    if (isValueChanged) acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as ICategoryBody,
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        
        // Попытка отправки формы, находясь в корне категорий
        if (isEditMode && !categoryId) {
            console.error('Категория товаров не выбрана. Редактирование невозможно.');
            return setSubmitStatus(FORM_STATUS.BAD_REQUEST);
        }
        
        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (isEditMode && !changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        const performFormSubmission = async (): Promise<
            TCategoryPerformFormSubmissionResult | undefined
        > => {
            setSubmitStatus(FORM_STATUS.SENDING);
            dispatch(setNavigationLock(true));

            const requestThunk = (
                isEditMode
                    ? sendCategoryUpdateRequest(categoryId, formFields)
                    : sendCategoryCreateRequest(formFields)
            ) as TAppThunk<Promise<TCategoryCreateResponse | TCategoryUpdateResponse>> ;
            const responseData = await dispatch(requestThunk);
            if (isUnmountedRef.current) return;
            
            const { status, message } = responseData;
            const LOG_CTX = `CATEGORY: ${isEditMode ? 'UPDATE' : 'CREATE'}`;

            switch (status) {
                case FORM_STATUS.UNAUTH:
                case FORM_STATUS.USER_GONE:
                case FORM_STATUS.DENIED:
                case FORM_STATUS.BAD_REQUEST:
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
            
                case FORM_STATUS.SUCCESS: {
                    logRequestStatus({ context: LOG_CTX, status, message });

                    const fieldsStateUpdates: TFieldsStateUpdates = {};
                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    setSubmitStatus(status);

                    const finalizeSuccessHandling = (): void => {
                        if (isUnmountedRef.current) return;

                        changedFields.forEach(name => fieldsStateUpdates[name] = { uiStatus: '' });
                        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                        setSubmitStatus(FORM_STATUS.DEFAULT);
                        dispatch(setNavigationLock(false));
                    };

                    return {
                        status,
                        finalizeSuccessHandling,
                        newCategoryId: !isEditMode && 'newCategoryId' in responseData
                            ? responseData.newCategoryId
                            : undefined,
                        movedProductsCount: responseData.movedProductsCount
                    };
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

    // Очистка при размонтировании формы
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обновление всех полей при изменении их конфигов (смена категории, пересоздание карты)
    useEffect(() => {
        setSubmitStatus(FORM_STATUS.DEFAULT);
        dispatchFieldsState({
            type: 'RESET',
            payload: createInitialFieldsState<TFieldName>(fieldConfigs, initialStateOptions)
        });
    }, [fieldConfigs]);

    // Обновление поля order при изменении родителя категории в режиме редактирования
    useEffect(() => {
        if (!isEditMode || !safeParentData) return;

        const selectedParentId = String(fieldsState.parent.value);
        const subCount = safeParentData.subcatCounts[selectedParentId];
        if (subCount === undefined) return;

        const isCurrentParent = selectedParentId === (initValues.parent || '');

        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                order: {
                    value: isCurrentParent ? initValues.order + 1 : subCount + 1,
                    max: isCurrentParent ? subCount : subCount + 1,
                    uiStatus: '',
                    error: ''
                }
            }
        });
    }, [isEditMode, safeParentData, fieldsState.parent.value]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <form className="category-form" onSubmit={handleFormSubmit} noValidate>
            <header className="form-header">
                <h3>{`${isEditMode ? 'Изменение' : 'Создание'} категории товаров`}</h3>
            </header>

            <div className="form-body">
                {fieldConfigs.map(({
                    name,
                    label,
                    elem,
                    type,
                    outputValue,
                    placeholder,
                    autoComplete,
                    min,
                    trim,
                    options,
                    lock: isFieldLocked
                }) => {
                    const fieldId = `category-${isEditMode ? 'edit' : 'create'}-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);

                    const baseElemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
                        onChange: handleFieldChange,
                        disabled: isFormLocked || isFieldLocked
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

                        if (elem === 'output') return (
                            <output>{outputValue}</output>
                        );
                    
                        return (
                            <input
                                {...baseElemProps}
                                type={type}
                                placeholder={placeholder}
                                value={getStringValue(fieldsState[name]?.value)}
                                min={min}
                                max={getStringValue(fieldsState[name]?.max)}
                                onBlur={trim ? handleFieldBlur : undefined}
                                autoComplete={autoComplete}
                            />
                        );
                    })();

                    return (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <label htmlFor={fieldId} className="form-entry-label">{label}:</label>

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
