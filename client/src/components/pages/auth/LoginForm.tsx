import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import { sendAuthLoginRequest } from '@/api/authRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
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
import type {JSX, ChangeEvent, FocusEvent, SubmitEvent } from 'react';
import type {
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    TFieldStateValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { TEntityField, IAuthLoginBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'auth'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TFormFields = {
    [K in keyof IAuthLoginBody['formFields']]: TFieldStateValue;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (): IGetSubmitStatesResult => {
    const { DEFAULT, UNAUTH, BAD_REQUEST, INVALID, ERROR, TIMEOUT, SUCCESS } = FORM_STATUS;
    const base = BASE_SUBMIT_STATES;
    const actionLabel = 'Войти';

    const submitStates: TSubmitStates = {
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
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
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

const fieldConfigs = extendFieldConfigs([
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

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function LoginForm(): JSX.Element {
    const guestCart = useMemo(() => prepareGuestCartPayload(), []);

    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);

    const isUnmountedRef = useRef(false);
    
    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleRememberMe = (e: ChangeEvent<HTMLInputElement>): void => {
        setRememberMe(e.currentTarget.checked);
        localStorage.setItem('rememberMe', String(e.currentTarget.checked));
    };

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
        IAuthLoginBody['formFields']
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
                
                const isValid =
                    typeof normalizedValue === 'string'
                        ? validation.test(normalizedValue) 
                        : false;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.auth[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    (acc.formFields as TFormFields)[name] = normalizedValue;
                } else {
                    acc.allValid = false;
                }

                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IAuthLoginBody['formFields']
            }
        );
    
        if (result.allValid) result.formFields.rememberMe = rememberMe;
        
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

        const responseData = await dispatch(sendAuthLoginRequest({ formFields, guestCart }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'AUTH: LOGIN';

        switch (status) {
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;
                
            case FORM_STATUS.UNAUTH:
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

                    const locationFrom = location.state?.from;
                    const fromPath = locationFrom
                        ? locationFrom.pathname + (locationFrom.search || '')
                        : null;
                    let targetPath = fromPath || routeConfig.home.paths[0];

                    if (user.role === USER_ROLE.CUSTOMER) {
                        const { redirectTo } = dispatch(initCustomerSession({
                            tradeProductList,
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
    }, [dispatch]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
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
                        elem,
                        type,
                        placeholder,
                        autoComplete,
                        trim
                    }) => {
                        const fieldId = `login-${toKebabCase(name)}`;
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

                    <div className="form-entry">
                        <DesignedCheckbox
                            id="remember-me"
                            name="remember-me"
                            label="Запомнить меня"
                            checked={rememberMe}
                            onChange={handleRememberMe}
                            disabled={isFormLocked}
                        />
                    </div>
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
