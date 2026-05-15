import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import cn from 'classnames';
import FormFooter from '@/components/common/FormFooter.jsx';
import { routeConfig } from '@/config/appRouting.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { sendAuthRegistrationRequest } from '@/api/authRequests.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { login, resetSuppressAuthRedirect } from '@/redux/slices/authSlice.js';
import { prepareGuestCartPayload } from '@/services/guestCartService.js';
import { saveUserToLocalStorage, initCustomerSession } from '@/services/authService.js';
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
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { USER_ROLE } from '@shared/constants.js';
import type { JSX, ChangeEvent, FocusEvent, SubmitEvent } from 'react';
import type {
    TFormStatus,
    TSubmitStates,
    IGetSubmitStatesResult,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { TEntityField, IAuthRegistrationBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'auth'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof IAuthRegistrationBody['formFields']]: TFieldApiValue;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const { DEFAULT, BAD_REQUEST, INVALID, ERROR, TIMEOUT, SUCCESS } = FORM_STATUS;
    const actionLabel = 'Зарегистрироваться';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Регистрация завершена!',
            addMessage: 'Вы автоматически войдёте в аккаунт и будете перенаправлены на главную страницу.',
            submitBtnLabel: 'Перенаправление...'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const getFieldConfigs = (isAdminRegistration: boolean) => {
    const baseFieldConfigs = [
        {
            name: 'name',
            label: 'Имя',
            elem: 'input',
            type: 'text',
            placeholder: 'Укажите имя пользователя',
            autoComplete: 'on',
            trim: true
        },
        {
            name: 'email',
            label: 'Email',
            elem: 'input',
            type: 'email',
            placeholder: 'Укажите почтовый ящик',
            autoComplete: 'on',
            trim: true
        },
        {
            name: 'password',
            label: 'Пароль',
            elem: 'input',
            type: 'password',
            placeholder: 'Укажите пароль',
            autoComplete: 'off'
        },
        {
            name: 'confirmPassword',
            label: 'Пароль (повтор)',
            elem: 'input',
            type: 'password',
            placeholder: 'Подтвердите пароль',
            autoComplete: 'off'
        }
    ] as const;
    
    const adminRegCodeFieldConfig = [
        {
            name: 'adminRegCode',
            label: 'Код администратора',
            elem: 'input',
            type: 'password',
            placeholder: 'Введите код администратора',
            autoComplete: 'off'
        }
    ] as const;

    const resultFieldConfigs = isAdminRegistration
        ? [...baseFieldConfigs, ...adminRegCodeFieldConfig]
        : [...baseFieldConfigs];

    return extendFieldConfigs(resultFieldConfigs);
};

export default function RegistrationForm(): JSX.Element {
    const [searchParams] = useSearchParams();
    const isAdminRegistration = searchParams.get('admin') === 'true';

    const guestCart = useMemo(() => prepareGuestCartPayload(), []);

    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(isAdminRegistration);
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);
        
        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [isAdminRegistration]);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        createInitialFieldsState<TFieldName>
    );
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.currentTarget;
        
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value, uiStatus: '', error: '' } }
        });
    };

    const handleTrimmedFieldBlur = (e: FocusEvent<HTMLInputElement>): void => {
        const { name, value } = e.currentTarget;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IAuthRegistrationBody['formFields']
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.auth[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const isConfirmPassword = name === 'confirmPassword';
                
                const isValid =
                    typeof normalizedValue === 'string'
                        ? validation.test(normalizedValue) &&
                            (!isConfirmPassword || normalizedValue === fieldsState.password.value)
                        : false;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.auth[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid && !isConfirmPassword) {
                    (acc.formFields as TApiFormFields)[name] = normalizedValue;
                }
        
                if (!isValid) acc.allValid = false;
                
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IAuthRegistrationBody['formFields']
            }
        );

        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        const { allValid, fieldsStateUpdates, formFields } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const responseData = await dispatch(sendAuthRegistrationRequest({ formFields, guestCart }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'AUTH: REGISTER';

        switch (status) {
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;
                
            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                (Object.entries(fieldErrors) as [TFieldName, string][])
                    .forEach(([name, error]) => {
                        if (name in fieldConfigMap) {
                            fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                        }
                    });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;
            }
        
            case FORM_STATUS.SUCCESS: {
                const {
                    user, accessTokenExp, refreshTokenExp,
                    tradeProductList, cartItemList, cartWasMerged, orderDraftId
                } = responseData;

                logRequestStatus({ context: LOG_CTX, status, message });
                saveUserToLocalStorage(user);

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                fieldConfigs.forEach(({ name }) => {
                    if (name in fieldConfigMap) {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                    }
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
                setSubmitStatus(status);
        
                setTimeout(() => {
                    if (isUnmountedRef.current) return;

                    dispatch(login({
                        suppressAuthRedirect: true,
                        user,
                        accessTokenExp,
                        refreshTokenExp
                    }));

                    let targetPath: string = routeConfig.home.paths[0];

                    if (user.role === USER_ROLE.CUSTOMER) {
                        const { redirectTo } = dispatch(initCustomerSession({
                            tradeProductList,
                            cartItemList,
                            customerDiscount: user.discount,
                            orderDraftId,
                            cartWasMerged,
                            isFirstLogin: true
                        }));
                        
                        if (redirectTo) targetPath = redirectTo;
                    }

                    navigate(targetPath, { replace: true });
                }, SUCCESS_DELAY);

                break;
            }
        
            default:
                logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                setSubmitStatus(FORM_STATUS.UNKNOWN);
                dispatch(setNavigationLock(false));
                break;
        }
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
            dispatch(resetSuppressAuthRedirect());
        };
    }, []);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <div className="auth-page">
            <form className="auth-form" data-type="registration" onSubmit={handleFormSubmit} noValidate>
                <header className="form-header">
                    <h2>Форма регистрации</h2>
                </header>

                <div className="form-body">
                    {fieldConfigs.map(({ name, label, elem, type, placeholder, autoComplete, trim }) => {
                        const fieldId = `reg-${toKebabCase(name)}`;
                        const fieldInfoClass = getFieldInfoClass(elem, type, name);

                        return (
                            <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                                <label htmlFor={fieldId} className="form-entry-label">{label}:</label>
                                
                                <span className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                    <input
                                        id={fieldId}
                                        name={name}
                                        type={type}
                                        placeholder={placeholder}
                                        value={getStringValue(fieldsState[name]?.value)}
                                        autoComplete={autoComplete}
                                        onChange={handleFieldChange}
                                        onBlur={trim ? handleTrimmedFieldBlur : undefined}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState[name]?.error && (
                                        <span className="invalid-message">
                                            *{fieldsState[name].error}
                                        </span>
                                    )}
                                </span>
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
        </div>
    );
}
