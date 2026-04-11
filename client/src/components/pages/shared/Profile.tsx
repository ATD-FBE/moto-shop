import { useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import { sendAuthUserUpdateRequest } from '@/api/authRequests.js';
import { FORM_STATUS, BASE_SUBMIT_STATES, FIELD_UI_STATUS, SUCCESS_DELAY } from '@/config/constants.js';
import { setIsNavigationBlocked } from '@/redux/slices/uiSlice.js';
import { updateUser } from '@/redux/slices/authSlice.js';
import { saveUserToLocalStorage } from '@/services/authService.js';
import {
    getLockedStatuses,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import type {
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { TEntityField, IAuthUserUpdateBody } from '@shared/types/index.js';

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const { DEFAULT, BAD_REQUEST, UNCHANGED, INVALID, ERROR, TIMEOUT, SUCCESS } = FORM_STATUS;
    const actionLabel = 'Сохранить';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Данные пользователя остались без изменений.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Данные пользователя обновлены!',
            submitBtnLabel: 'Сохранено'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const fieldConfigs = extendFieldConfigs([
    {
        name: 'newName',
        label: 'Новое имя',
        elem: 'input',
        type: 'text',
        placeholder: 'Укажите новое имя пользователя',
        autoComplete: 'off',
        trim: true
    },
    {
        name: 'newEmail',
        label: 'Новый email',
        elem: 'input',
        type: 'email',
        placeholder: 'Укажите новый почтовый ящик',
        autoComplete: 'off',
        trim: true
    },
    {
        name: 'currentPassword',
        label: 'Текущий пароль',
        elem: 'input',
        type: 'password',
        placeholder: 'Укажите текущий пароль',
        autoComplete: 'off',
        isPassword: true
    },
    {
        name: 'newPassword',
        label: 'Новый пароль',
        elem: 'input',
        type: 'password',
        placeholder: 'Укажите новый пароль',
        isPassword: true
    },
    {
        name: 'confirmNewPassword',
        label: 'Новый пароль (повтор)',
        elem: 'input',
        type: 'password',
        placeholder: 'Подтвердите новый пароль',
        isPassword: true
    }
] as const);

// Локальная типизация конфигов полей
type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = TFieldConfig['name'];

// Проверка наличия полей конфига в наборе полей сущности
type TValidFieldName = Extract<TFieldName, TEntityField<'auth'>>;

// Вспомогательные типы
type TFieldsStateUpdates = Partial<Record<TValidFieldName, Partial<IFieldState>>>;

// Создание карты и начального состояния полей
const fieldConfigMap = createFieldConfigMap<TValidFieldName, TFieldConfig>(fieldConfigs);
const initFieldsState = createInitFieldsState<TValidFieldName>(fieldConfigs);
 
export default function Profile(): React.JSX.Element | null {
    const user = useAppSelector(state => state.auth.user);
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value, uiStatus: '', error: '' } }
        });
    };

    const handleTrimmedFieldBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<TValidFieldName, IAuthUserUpdateBody> => {
        const fieldsStateEntries = (Object.entries(fieldsState) as [TValidFieldName, IFieldState][]);

        const isAnyPasswordFieldFilled = fieldsStateEntries
            .some(([name, { value }]) => fieldConfigMap[name]?.isPassword && value !== '');
      
        const result = fieldsStateEntries.reduce(
            (acc, [name, { value }]) => {
                const { trim, isPassword } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const isNonPasswordFieldEmpty = !isPassword && normalizedValue === '';
                const isPasswordFieldInEmptyGroup = isPassword && !isAnyPasswordFieldFilled;

                if (isNonPasswordFieldEmpty || isPasswordFieldInEmptyGroup) {
                    acc.fieldsStateUpdates[name] = {
                        value: normalizedValue,
                        uiStatus: '',
                        error: ''
                    };
                    return acc;
                }

                const validation = validationRules.auth[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const isConfirmNewPassword = name === 'confirmNewPassword';

                const isValid =
                    typeof normalizedValue === 'string' 
                        ? validation.test(normalizedValue) &&
                            (!isConfirmNewPassword || normalizedValue === fieldsState.newPassword.value)
                        : false;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.auth[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid && !isConfirmNewPassword) {
                    acc.formFields[name] = normalizedValue;
                }
        
                if (!isValid) acc.allValid = false;

                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IAuthUserUpdateBody & Record<TValidFieldName, any>
            }
        );
    
        return result;
    };

    const handleFormSubmit = async (e: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        const { allValid, fieldsStateUpdates, formFields } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (!Object.keys(formFields).length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setIsNavigationBlocked(true));

        const responseData = await dispatch(sendAuthUserUpdateRequest(formFields));
        const { status, message } = responseData;
        if (isUnmountedRef.current) return;

        const LOG_CTX = 'AUTH: UPDATE';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.UNCHANGED:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;

            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                (Object.entries(fieldErrors) as [TValidFieldName, string][]).forEach(([name, error]) => {
                    if (name in fieldConfigMap) {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                    }
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;
            }
        
            case FORM_STATUS.PARTIAL:
            case FORM_STATUS.SUCCESS: {
                const { fieldErrors = {}, updatedFormFields, updatedUser } = responseData;

                logRequestStatus({
                    context: LOG_CTX,
                    status,
                    message,
                    ...(Object.keys(fieldErrors).length && { details: fieldErrors })
                });

                const fieldsToUpdate = updatedFormFields.filter(
                    (name): name is TValidFieldName => name in fieldConfigMap
                );
                if (fieldsToUpdate.includes('newPassword')) {
                    fieldsToUpdate.push('currentPassword', 'confirmNewPassword');
                }

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                fieldsToUpdate.forEach(name => {
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                });
                (Object.entries(fieldErrors) as [TValidFieldName, string][]).forEach(([name, error]) => {
                    if (name in fieldConfigMap) {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                    }
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                saveUserToLocalStorage(updatedUser);
                dispatch(updateUser(updatedUser));
                setSubmitStatus(status);

                setTimeout(() => {
                    if (isUnmountedRef.current) return;

                    fieldsToUpdate.forEach(name => {
                        fieldsStateUpdates[name] = { value: '', uiStatus: '' };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    setSubmitStatus(FORM_STATUS.DEFAULT);
                    dispatch(setIsNavigationBlocked(false));
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
        };
    }, []);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(val => Boolean(val.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    if (!user) return null;

    return (
        <div className="profile-page">
            <header className="profile-header">
                <h2>Настройки профиля</h2>
                <p>Управление данными аккаунта</p>
            </header>
            
            <form className="profile-form" onSubmit={handleFormSubmit} noValidate>
                <div className="form-body">
                    <div className="form-group">
                        <div className="form-group-title">
                            <h4>Изменение имени пользователя</h4>
                        </div>

                        <div className="form-entry">
                            <div className="form-col col-left label">Текущее имя:</div>
                            <div className="form-col col-right current-value">{user.name}</div>
                        </div>

                        <div className="form-entry">
                            <div className="form-col col-left label">
                                <label htmlFor="newName" className="form-entry-label">
                                    Новое имя:
                                </label>
                            </div>

                            <div className="form-col col-right field">
                                <div className={cn(
                                    'form-entry-field',
                                    fieldsState.newName.uiStatus
                                )}>
                                    <input
                                        type="text"
                                        id="newName"
                                        name="newName"
                                        placeholder="Укажите новое имя пользователя"
                                        value={getStringValue(fieldsState.newName.value)}
                                        autoComplete="off"
                                        onChange={handleFieldChange}
                                        onBlur={handleTrimmedFieldBlur}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState.newName.error && (
                                        <span className="invalid-message">
                                            *{fieldsState.newName.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="form-group-title">
                            <h4>Изменение почтового ящика</h4>
                        </div>

                        <div className="form-entry">
                            <div className="form-col col-left label">Текущий email:</div>
                            <div className="form-col col-right current-value">{user.email}</div>
                        </div>

                        <div className="form-entry">
                            <div className="form-col col-left label">
                                <label htmlFor="newEmail" className="form-entry-label">
                                    Новый email:
                                </label>
                            </div>

                            <div className="form-col col-right field">
                                <div className={cn(
                                    'form-entry-field',
                                    fieldsState.newEmail.uiStatus
                                )}>
                                    <input
                                        id="newEmail"
                                        name="newEmail"
                                        type="email"
                                        placeholder="Укажите новый почтовый ящик"
                                        value={getStringValue(fieldsState.newEmail.value)}
                                        autoComplete="off"
                                        onChange={handleFieldChange}
                                        onBlur={handleTrimmedFieldBlur}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState.newEmail.error && (
                                        <span className="invalid-message">
                                            *{fieldsState.newEmail.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="form-group-title">
                            <h4>Изменение пароля</h4>
                        </div>

                        <div className="form-entry error-space">
                            <div className="form-col col-left label">
                                <label htmlFor="currentPassword" className="form-entry-label">
                                    Текущий пароль:
                                </label>
                            </div>

                            <div className="form-col col-right field">
                                <div className={cn(
                                    'form-entry-field',
                                    fieldsState.currentPassword.uiStatus
                                )}>
                                    <input
                                        type="password"
                                        id="currentPassword"
                                        name="currentPassword"
                                        placeholder="Укажите текущий пароль"
                                        value={getStringValue(fieldsState.currentPassword.value)}
                                        autoComplete="off"
                                        onChange={handleFieldChange}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState.currentPassword.error && (
                                        <span className="invalid-message">
                                            *{fieldsState.currentPassword.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-entry error-space">
                            <div className="form-col col-left label">
                                <label htmlFor="newPassword" className="form-entry-label">
                                    Новый пароль:
                                </label>
                            </div>

                            <div className="form-col col-right field">
                                <div className={cn(
                                    'form-entry-field',
                                    fieldsState.newPassword.uiStatus
                                )}>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        placeholder="Укажите новый пароль"
                                        value={getStringValue(fieldsState.newPassword.value)}
                                        autoComplete="off"
                                        onChange={handleFieldChange}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState.newPassword.error && (
                                        <span className="invalid-message">
                                            *{fieldsState.newPassword.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-entry error-space">
                            <div className="form-col col-left label">
                                <label htmlFor="confirmNewPassword" className="form-entry-label">
                                    Новый пароль (повтор):
                                </label>
                            </div>

                            <div className="form-col col-right field">
                                <div className={cn(
                                    'form-entry-field',
                                    fieldsState.confirmNewPassword.uiStatus
                                )}>
                                    <input
                                        type="password"
                                        id="confirmNewPassword"
                                        name="confirmNewPassword"
                                        placeholder="Подтвердите новый пароль"
                                        value={getStringValue(fieldsState.confirmNewPassword.value)}
                                        autoComplete="off"
                                        onChange={handleFieldChange}
                                        disabled={isFormLocked}
                                    />
                                    
                                    {fieldsState.confirmNewPassword.error && (
                                        <span className="invalid-message">
                                            *{fieldsState.confirmNewPassword.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
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
