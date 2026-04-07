import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { sendAuthLoginRequest } from '@/api/authRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { FORM_STATUS, BASE_SUBMIT_STATES, FIELD_UI_STATUS, SUCCESS_DELAY } from '@/config/constants.js';
import { setIsNavigationBlocked } from '@/redux/slices/uiSlice.js';
import { login, resetSuppressAuthRedirect } from '@/redux/slices/authSlice.js';
import { prepareGuestCartPayload } from '@/services/guestCartService.js';
import { saveUserToLocalStorage, initCustomerSession } from '@/services/authService.js';
import {
    getLockedStatuses,
    applyCommonFieldConfig,
    createFieldConfigMap,
    createInitFieldsState,
    fieldsStateReducer
} from '@/helpers/formHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { USER_ROLE } from '@shared/constants.js';
import type {
    TFormStatus,
    IBaseSubmitState,
    IGetSubmitStatesResult,
    IFieldState,
    TFieldsState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { IAuthLoginBody } from '@shared/types/index.js';

const getSubmitStates = (): IGetSubmitStatesResult => {
    const { DEFAULT, UNAUTH, BAD_REQUEST, INVALID, ERROR, NETWORK, SUCCESS } = FORM_STATUS;
    const base = BASE_SUBMIT_STATES;
    const actionLabel = 'Войти';

    const submitStates: Record<TFormStatus, IBaseSubmitState> = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [UNAUTH]: {
            ...base[UNAUTH],
            icon: '⚠️',
            mainMessage: 'Некорректные данные.',
            addMessage: 'Исправьте ошибки в форме.',
            submitBtnLabel: actionLabel,
            locked: false
        },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [NETWORK]: { ...base[NETWORK], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Вход выполнен успешно!',
            addMessage: 'Вы будете перенаправлены на главную страницу.',
            submitBtnLabel: 'Перенаправление...'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const fieldConfigs = applyCommonFieldConfig([
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
        name: 'password',
        label: 'Пароль',
        elem: 'input',
        type: 'password',
        placeholder: 'Укажите пароль',
        autoComplete: 'on'
    }
] as const);

// Локальная типизация конфигов полей
type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = TFieldConfig['name'];

// Проверка наличия полей конфига в наборе полей для валидации по сущности
type TAuthEntityFields = keyof typeof validationRules['auth'];
type TValidFieldName = Extract<TFieldName, TAuthEntityFields>;

// Создание карты и начального состояния полей
const fieldConfigMap = createFieldConfigMap<TValidFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitFieldsState<TValidFieldName>(fieldConfigs);

export default function LoginForm() {
    const guestCart = useMemo(() => prepareGuestCartPayload(), []);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer<TValidFieldName>,
        initialFieldsState
    );
    const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);

    const isUnmountedRef = useRef(false);
    
    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleRememberMe = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRememberMe(e.target.checked);
        localStorage.setItem('rememberMe', String(e.target.checked));
    };

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value, uiStatus: '', error: '' } }
        });
    };

    const handleTrimmedFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TValidFieldName,
        IAuthLoginBody['formFields']
    > => {
        const result = (Object.entries(fieldsState) as [TValidFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.auth[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const isValid = validation.test(String(normalizedValue));

                acc.fieldStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.auth[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    acc.formFields[name] = normalizedValue;
                } else {
                    acc.allValid = false;
                }

                return acc;
            },
            {
                allValid: true,
                fieldStateUpdates: {} as TFieldsState<TValidFieldName>,
                formFields: {} as IAuthLoginBody['formFields'] & Record<TValidFieldName, any>
            }
        );
    
        if (result.allValid) result.formFields.rememberMe = rememberMe;
        
        return result;
    };

    const handleFormSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        const { allValid, fieldStateUpdates, formFields } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setIsNavigationBlocked(true));

        const responseData = await dispatch(sendAuthLoginRequest({ formFields, guestCart }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'AUTH: LOGIN';

        switch (status) {
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.NETWORK:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;
                
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                const fieldStateUpdates = {} as TFieldsState<TValidFieldName>;
                (Object.entries(fieldErrors) as [TValidFieldName, string][]).forEach(([name, error]) => {
                    fieldStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldStateUpdates });

                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;
            }

            case FORM_STATUS.SUCCESS: {
                const {
                    user, accessTokenExp, refreshTokenExp,
                    purchaseProductList, cartItemList, cartWasMerged, orderDraftId
                } = responseData;

                logRequestStatus({ context: LOG_CTX, status, message });
                saveUserToLocalStorage(user);

                const fieldStateUpdates = {} as TFieldsState<TValidFieldName>;
                fieldConfigs.forEach(({ name }) => {
                    fieldStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED, error: '' };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldStateUpdates });
        
                setSubmitStatus(status);
        
                setTimeout(async () => {
                    if (isUnmountedRef.current) return;

                    dispatch(login({
                        suppressAuthRedirect: true,
                        user,
                        accessTokenExp,
                        refreshTokenExp
                    }));

                    const locationFrom = location.state?.from;
                    const fromPath = locationFrom
                        ? locationFrom.pathname + (locationFrom.search || '')
                        : null;
                    let targetPath = fromPath || routeConfig.home.paths[0];

                    if (user.role === USER_ROLE.CUSTOMER) {
                        const { redirectTo } = await dispatch(initCustomerSession({
                            purchaseProductList,
                            cartItemList,
                            customerDiscount: user.discount,
                            orderDraftId,
                            cartWasMerged
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
                dispatch(setIsNavigationBlocked(false));
                break;
        }
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
            dispatch(resetSuppressAuthRedirect());
        };
    }, [dispatch]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(val => Boolean(val.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <div className="auth-page">
            <form className="auth-form" data-type="login" onSubmit={handleFormSubmit} noValidate>
                <header className="form-header">
                    <h2>Форма авторизации</h2>
                </header>

                <div className="form-body">
                    {fieldConfigs.map(({
                        name,
                        label,
                        type,
                        placeholder,
                        autoComplete,
                        trim
                    }) => (
                        <p key={`login-${name}`} className="form-entry">
                            <label htmlFor={`login-${name}`} className="form-entry-label">
                                {label}:
                            </label>
                            
                            <span className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                <input
                                    id={`login-${name}`}
                                    name={name}
                                    type={type}
                                    placeholder={placeholder}
                                    value={(fieldsState[name]?.value as string) ?? ''}
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
                        </p>
                    ))}

                    <p className="form-entry">
                        <DesignedCheckbox
                            id="remember-me"
                            name="remember-me"
                            label="Запомнить меня"
                            checked={rememberMe}
                            onChange={handleRememberMe}
                            disabled={isFormLocked}
                        />
                    </p>
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
