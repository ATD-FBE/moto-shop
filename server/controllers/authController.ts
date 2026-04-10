import jwt from 'jsonwebtoken';
import User from '@server/db/models/User.js';
import config from '@server/config/config.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareUser, prepareSession } from '@server/services/authService.js';
import { generateToken, getTokenExpiryFromCookie } from '@server/utils/tokenUtils.js';
import { typeCheck, validateInputTypes } from '@server/utils/typeValidation.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError, prepareAppErrorData } from '@server/utils/errorUtils.js';
import {
    isTokenDecodedUser,
    requireDbUser,
    isAppError,
    isMongooseValidationError
} from '@server/utils/typeGuards.js';
import { parseValidationErrors } from '@server/utils/errorUtils.js';
import { normalizeInputDataToNull } from '@server/utils/normalizeUtils.js';
import { isDbDataModified } from '@server/utils/compareUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import {
    TOKEN_COOKIE_OPTIONS,
    ACCESS_TOKEN_MAX_AGE,
    REFRESH_TOKEN_MAX_AGE
} from '@server/config/constants.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { toError } from '@shared/commonHelpers.js';
import { USER_ROLE, DELIVERY_METHOD } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { TInputTypeMap, TDbUser, TResponsePayload } from '@server/types/index.js';
import type {
    IAuthRegistrationBody,
    TAuthRegistrationResponse,
    IAuthLoginBody,
    TAuthLoginResponse,
    IAuthUserUpdateBody,
    TAuthUserUpdateResponse,
    IAuthSessionBody,
    TAuthSessionResponse,
    TAuthRefreshResponse,
    TAuthCheckoutPrefsResponse,
    IAuthCheckoutPrefsUpdateBody,
    TAuthCheckoutPrefsUpdateResponse,
    TAuthLogoutResponse,
    TEntityField
} from '@shared/types/index.js';

/// Регистрация ///
export const handleAuthRegistrationRequest: RequestHandler<
    {},
    TAuthRegistrationResponse,
    IAuthRegistrationBody
> = async (req, res, next) => {
    // Предварительная проверка формата данных
    const { formFields, guestCart } = req.body ?? {};
    const { name, email, password, adminRegCode } = formFields ?? {};

    const inputTypeMap: TInputTypeMap<'auth'> = {
        formFields: { value: formFields, type: 'object' },
        guestCart: { value: guestCart, type: 'arrayOf', elemType: 'object' },
        name: { value: name, type: 'string', form: true },
        email: { value: email, type: 'string', form: true },
        password: { value: password, type: 'string', form: true },
        adminRegCode: { value: adminRegCode, type: 'string', optional: true, form: true }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'auth');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors});
    }

    for (const { id, quantity } of guestCart) {
        if (!typeCheck.objectId(id) || !Number.isInteger(quantity) || quantity < 0) {
            return safeSendResponse(res, 400, { message: 'Неверный формат данных в guestCart' });
        }
    }

    // Создание документа в базе MongoDB
    const isAdmin = !!adminRegCode && adminRegCode === config.adminRegCode;
    const role = isAdmin ? USER_ROLE.ADMIN : USER_ROLE.CUSTOMER;

    try {
        const { newDbUser, sessionData } = await runInDbTransaction(async (session) => {
            const newDbUser = new User({
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                ...(role === USER_ROLE.CUSTOMER && {
                    notifications: [],
                    discount: 0
                })
            });

            const sessionData = await prepareSession(newDbUser, guestCart);
            checkTimeout(req);
    
            await newDbUser.save({ session });
            checkTimeout(req);

            return { newDbUser, sessionData };
        });

        // Генерация токенов доступа и обновления
        const now = Date.now();
        const accessTokenExp = now + ACCESS_TOKEN_MAX_AGE;
        const refreshTokenExp = now + REFRESH_TOKEN_MAX_AGE;

        const accessToken = generateToken(newDbUser, 'access');
        res.cookie('accessToken', accessToken, { ...TOKEN_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE });

        const refreshToken = generateToken(newDbUser, 'refresh');
        res.cookie('refreshToken', refreshToken, { ...TOKEN_COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE });
        
        // Отправка ответа клиенту
        safeSendResponse(res, 201, {
            message: 'Регистрация прошла успешно',
            accessTokenExp,
            refreshTokenExp,
            ...sessionData
        });
    } catch (err) {
        const error = toError(err);

        // Обработка ошибок валидации полей при сохранении в MongoDB
        if (isMongooseValidationError(error)) {
            const { systemFieldError, fieldErrors } = parseValidationErrors(error, 'auth');
            if (systemFieldError) return next(systemFieldError);
        
            if (fieldErrors) {
                return safeSendResponse(res, 422, { message: 'Некорректные данные', fieldErrors });
            }
        }

        next(error);
    }
};

/// Авторизация ///
export const handleAuthLoginRequest: RequestHandler<
    {},
    TAuthLoginResponse,
    IAuthLoginBody
> = async (req, res, next) => {
    // Предварительная проверка формата данных
    const { formFields, guestCart } = req.body ?? {};
    const { name, password, rememberMe } = formFields ?? {};

    const inputTypeMap: TInputTypeMap<'auth'> = {
        formFields: { value: formFields, type: 'object' },
        guestCart: { value: guestCart, type: 'arrayOf', elemType: 'object' },
        name: { value: name, type: 'string', form: true },
        password: { value: password, type: 'string', form: true },
        rememberMe: { value: rememberMe, type: 'boolean' }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'auth');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    for (const { id, quantity } of guestCart) {
        if (!typeCheck.objectId(id) || !Number.isInteger(quantity) || quantity < 0) {
            return safeSendResponse(res, 400, { message: 'Неверный формат данных в guestCart' });
        }
    }

    // Валидация полей
    const INVALID_AUTH_MSG = 'Некорректные данные при авторизации';
    const prepDbFields = {
        name: name.trim(),
        password
    } as const;
    
    (Object.entries(prepDbFields) as [
        keyof typeof prepDbFields,
        typeof prepDbFields[keyof typeof prepDbFields]
    ][]).forEach(([field, value]) => {
        const isValid = validationRules.auth[field].test(value);

        if (!isValid) {
            fieldErrors[field] = fieldErrorMessages.auth[field]?.login || DEFAULT_FIELD_ERROR_MESSAGE;
        }
    });

    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: INVALID_AUTH_MSG, fieldErrors });
    }

    // Проверка данных пользователя в базе MongoDB
    try {
        const { dbUser, sessionData } = await runInDbTransaction(async (session) => {
            // Поиск пользователя
            const dbUser = await User.findOne({ name: prepDbFields.name }).session(session);
            checkTimeout(req);

            if (!dbUser) {
                fieldErrors.name = fieldErrorMessages.auth.name.login;
                throw createAppError(401, INVALID_AUTH_MSG, { fieldErrors });
            }

            // Проверка пароля
            const isPasswordCorrect = await dbUser.comparePassword(password);
            checkTimeout(req);

            if (!isPasswordCorrect) {
                fieldErrors.password = fieldErrorMessages.auth.password.login;
                throw createAppError(401, INVALID_AUTH_MSG, { fieldErrors });
            }

            // Получение данных сессии
            const sessionData = await prepareSession(dbUser, guestCart);
            checkTimeout(req);

            if (sessionData.cartWasMerged) {
                await dbUser.save({ session });
                checkTimeout(req);
            }

            return { dbUser, sessionData };
        });

        // Генерация токенов доступа
        const now = Date.now();
        const accessTokenExp = now + ACCESS_TOKEN_MAX_AGE;
        const refreshTokenExp = rememberMe ? now + REFRESH_TOKEN_MAX_AGE : 0;

        const accessToken = generateToken(dbUser, 'access');
        res.cookie('accessToken', accessToken, { ...TOKEN_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE });

        if (rememberMe) {
            const refreshToken = generateToken(dbUser, 'refresh');
            res.cookie('refreshToken', refreshToken, {
                ...TOKEN_COOKIE_OPTIONS,
                maxAge: REFRESH_TOKEN_MAX_AGE
            });
        } else {
            res.clearCookie('refreshToken', TOKEN_COOKIE_OPTIONS);
        }

        safeSendResponse(res, 200, {
            message: 'Авторизация прошла успешно',
            accessTokenExp,
            refreshTokenExp,
            ...sessionData
        });
    } catch (err) {
        const error = toError(err);

        if (isAppError(error)) {
            return safeSendResponse(res, error.statusCode, prepareAppErrorData(error));
        }

        next(error);
    }
};

/// Изменение данных пользователя ///
export const handleAuthUserUpdateRequest: RequestHandler<
    {},
    TAuthUserUpdateResponse,
    IAuthUserUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    // Предварительная проверка формата данных
    const { newName, newEmail, currentPassword, newPassword } = req.body ?? {};

    if ([newName, newEmail, newPassword].every(field => field === undefined)) {
        return safeSendResponse(res, 204);
    }

    const inputTypeMap: TInputTypeMap<'auth'> = {
        newName: { value: newName, type: 'string', optional: true, form: true },
        newEmail: { value: newEmail, type: 'string', optional: true, form: true },
        currentPassword: { value: currentPassword, type: 'string', optional: true, form: true },
        newPassword: { value: newPassword, type: 'string', optional: true, form: true }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'auth');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }
    
    const dbUser = req.dbUser;
    const dbUserBackup: Partial<Pick<TDbUser, 'name' | 'email'>> = {
        name: dbUser.name,
        email: dbUser.email
    };
    const prepDbFields: Partial<IAuthUserUpdateBody> = {
        newName: newName?.trim(),
        newEmail: newEmail?.trim(),
        currentPassword,
        newPassword
    };
    const updatedFormFields: Partial<TEntityField<'auth'>>[] = [];

    // Апдейт документа в базе MongoDB
    try {
        const { userData } = await runInDbTransaction(async (session) => {
            // Валидация пароля
            if (newPassword !== undefined) {
                if (validationRules.auth.newPassword.test(newPassword)) {
                    if (
                        currentPassword === undefined ||
                        !validationRules.auth.currentPassword.test(currentPassword)
                    ) {
                        fieldErrors.currentPassword =
                            fieldErrorMessages.auth.currentPassword.default ||
                            DEFAULT_FIELD_ERROR_MESSAGE;
                    } else {
                        const isPasswordCorrect = await dbUser.comparePassword(currentPassword);
                        checkTimeout(req);
        
                        if (!isPasswordCorrect) {
                            fieldErrors.currentPassword =
                                fieldErrorMessages.auth.currentPassword.default ||
                                DEFAULT_FIELD_ERROR_MESSAGE;
                        } else if (newPassword === currentPassword) {
                            fieldErrors.newPassword =
                                fieldErrorMessages.auth.newPassword.duplicate ||
                                DEFAULT_FIELD_ERROR_MESSAGE;
                        } else {
                            dbUser.password = newPassword;
                            updatedFormFields.push('newPassword');
                        }
                    }
                } else {
                    fieldErrors.newPassword =
                        fieldErrorMessages.auth.newPassword.default ||
                        DEFAULT_FIELD_ERROR_MESSAGE;
                }
            }

            // Предварительное обновление остальных полей
            const dbFieldToFormFieldMap = {
                name: 'newName',
                email: 'newEmail'
            } as const;

            for (const [dbField, formField] of Object.entries(dbFieldToFormFieldMap) as [
                keyof typeof dbFieldToFormFieldMap,
                keyof IAuthUserUpdateBody
            ][]) {
                const value = prepDbFields[formField];
                if (value === undefined) continue;

                if (dbUser[dbField] === value) {
                    fieldErrors[formField] =
                        fieldErrorMessages.auth[formField]?.duplicate ||
                        DEFAULT_FIELD_ERROR_MESSAGE;
                    continue;
                }

                dbUser[dbField] = value;
                updatedFormFields.push(formField);
            }

            // Сохранение пользователя
            try {
                await dbUser.save({ session }); // Первая попытка сохранения
                checkTimeout(req);
            } catch (err) {
                const error = toError(err);

                // Обработка ошибок валидации полей при сохранении в MongoDB
                if (isMongooseValidationError(error)) {
                    for (const dbField in error.errors) {
                        if (dbField in dbFieldToFormFieldMap) {
                            const safeDbField = dbField as keyof typeof dbFieldToFormFieldMap;
                            const formField = dbFieldToFormFieldMap[safeDbField];
                            
                            const errorMessageType = error.errors[safeDbField].kind === 'unique'
                                ? 'unique'
                                : 'default';
                            fieldErrors[formField] =
                                fieldErrorMessages.auth[formField]?.[errorMessageType] ||
                                DEFAULT_FIELD_ERROR_MESSAGE;
            
                            // Восстановление старого значения
                            if (safeDbField in dbUserBackup) {
                                const backupValue = dbUserBackup[safeDbField];

                                if (backupValue !== undefined) {
                                    dbUser[safeDbField] = backupValue; 
                                    
                                    const fieldIndex = updatedFormFields.indexOf(formField);
                                    if (fieldIndex !== -1) updatedFormFields.splice(fieldIndex, 1);
                                }
                            }
                        } else {
                            throw createAppError(400, `Некорректное значение поля: ${dbField}`);
                        }
                    }

                    // Вторая попытка сохранения, исключая поля с ошибками
                    if (updatedFormFields.length > 0) {
                        await dbUser.save({ session });
                        checkTimeout(req);
                    }
                } else {
                    throw error;
                }
            }

            const userData = await prepareUser(dbUser);
            checkTimeout(req);

            return { userData };
        });
        

        // Отправка ответа клиенту
        const hasErrors  = Object.keys(fieldErrors).length > 0;
        const hasUpdates = updatedFormFields.length > 0;
    
        switch (true) {
            case hasErrors && !hasUpdates:
                return safeSendResponse(res, 422, {
                    message: 'Ошибки в данных. Изменения не применены',
                    fieldErrors
                });
            case hasErrors && hasUpdates:
                return safeSendResponse(res, 207, {
                    message: 'Данные пользователя частично обновлены',
                    fieldErrors,
                    updatedFormFields,
                    updatedUser: userData
                });
            case !hasErrors && hasUpdates:
                return safeSendResponse(res, 200, {
                    message: 'Данные пользователя обновлены',
                    updatedFormFields,
                    updatedUser: userData
                });
            default: // !hasErrors && !hasUpdates
                return safeSendResponse(res, 204);
        }
    } catch (err) {
        const error = toError(err);

        if (isAppError(error)) {
            return safeSendResponse(res, error.statusCode, prepareAppErrorData(error));
        }

        next(error);
    }
};

/// Загрузка данных сессии пользователя ///
export const handleAuthSessionRequest: RequestHandler<
    {},
    TAuthSessionResponse,
    IAuthSessionBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const { guestCart } = req.body ?? {};

    if (!typeCheck.arrayOf(guestCart, 'object', typeCheck)) {
        return safeSendResponse(res, 400, { message: 'Неверный формат данных: guestCart' });
    }

    for (const { id, quantity } of guestCart) {
        if (!typeCheck.objectId(id) || !Number.isInteger(quantity) || quantity < 0) {
            return safeSendResponse(res, 400, { message: 'Неверный формат данных в guestCart' });
        }
    }

    try {
        const { sessionData } = await runInDbTransaction(async (session) => {
            const sessionData = await prepareSession(dbUser, guestCart);
            checkTimeout(req);

            if (sessionData.cartWasMerged) {
                await dbUser.save({ session });
                checkTimeout(req);
            }

            return { sessionData };
        });

        const accessTokenExp = getTokenExpiryFromCookie(req, 'access');
        const refreshTokenExp = getTokenExpiryFromCookie(req, 'refresh');

        const message = 'Данные сессии пользователя успешно загружены' +
            (sessionData.cartWasMerged
                ? '. Корзины успешно объединены, приоритет количества товаров — у гостевой.'
                : '');

        safeSendResponse(res, 200, { message, accessTokenExp, refreshTokenExp, ...sessionData });
    } catch (err) {
        next(toError(err));
    }
};

/// Обновление токена доступа ///
export const handleAuthRefreshRequest: RequestHandler<{}, TAuthRefreshResponse> = async (req, res, next) => {
    try {
        const refreshToken: string | undefined = req.cookies.refreshToken;
        
        if (!refreshToken) {
            return safeSendResponse(res, 401, { message: 'Токен обновления отсутствует' });
        }

        const decodedUser = jwt.verify(refreshToken, config.jwt.refreshSecretKey);

        if (!isTokenDecodedUser(decodedUser)) {
            return safeSendResponse(res, 401, { message: 'Неверный формат или поврежденный токен' });
        }

        const accessToken = generateToken(decodedUser, 'access');
        res.cookie('accessToken', accessToken, { ...TOKEN_COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE });

        const accessTokenExp = Date.now() + ACCESS_TOKEN_MAX_AGE;
        
        safeSendResponse(res, 200, { message: 'Токен доступа обновлён', accessTokenExp });
    } catch (err) {
        const error = toError(err);

        if (error instanceof jwt.TokenExpiredError) {
            return safeSendResponse(res, 401, { message: 'Срок действия токена обновления истёк' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return safeSendResponse(res, 401, { message: 'Неверный токен обновления' });
        }
        if (error instanceof jwt.NotBeforeError) {
            return safeSendResponse(res, 401, { message: 'Токен обновления ещё не активен' });
        }

        next(error);
    }
};

/// Загрузка настроек заказа ///
export const handleAuthCheckoutPrefsRequest: RequestHandler<
    {},
    TAuthCheckoutPrefsResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    safeSendResponse(res, 200, {
        message: 'Настройки заказа успешно загружены',
        checkoutPrefs: req.dbUser.checkoutPrefs
    });
};

/// Изменение настроек заказа ///
export const handleAuthCheckoutPrefsUpdateRequest: RequestHandler<
    {},
    TAuthCheckoutPrefsUpdateResponse,
    IAuthCheckoutPrefsUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;

    // Предварительная проверка формата данных
    const {
        firstName, lastName, middleName, email, phone,
        deliveryMethod, allowCourierExtra,
        region, district, city, street, house, apartment, postalCode,
        defaultPaymentMethod
    } = req.body ?? {};

    const inputTypeMap: TInputTypeMap<'checkout'> = {
        firstName: { value: firstName, type: 'string', optional: true, form: true },
        lastName: { value: lastName, type: 'string', optional: true, form: true },
        middleName: { value: middleName, type: 'string', optional: true, form: true },
        email: { value: email, type: 'string', optional: true, form: true },
        phone: { value: phone, type: 'string', optional: true, form: true },
        deliveryMethod: { value: deliveryMethod, type: 'string', optional: true, form: true },
        allowCourierExtra: { value: allowCourierExtra, type: 'boolean', optional: true, form: true },
        region: { value: region, type: 'string', optional: true, form: true },
        district: { value: district, type: 'string', optional: true, form: true },
        city: { value: city, type: 'string', optional: true, form: true },
        street: { value: street, type: 'string', optional: true, form: true },
        house: { value: house, type: 'string', optional: true, form: true },
        apartment: { value: apartment, type: 'string', optional: true, form: true },
        postalCode: { value: postalCode, type: 'string', optional: true, form: true },
        defaultPaymentMethod: { value: defaultPaymentMethod, type: 'string', optional: true, form: true }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'checkout');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    // Проверка на согласованность данных для метода курьерской доставки
    const isCourierMethod = deliveryMethod === DELIVERY_METHOD.COURIER;
    const isAllowCourierExtra = allowCourierExtra !== undefined;
    
    if ((isCourierMethod && !isAllowCourierExtra) || (!isCourierMethod && isAllowCourierExtra)) {
        return safeSendResponse(res, 400, { message: 'Несогласованные данные для метода доставки' });
    }

    // Создание и форматирование настроек заказа
    const oldCheckoutPrefs = dbUser.toObject().checkoutPrefs ?? {};
    const newCheckoutPrefs: TDbUser['checkoutPrefs'] = normalizeInputDataToNull({
        customerInfo: { firstName, lastName, middleName, email, phone },
        delivery: {
            deliveryMethod,
            allowCourierExtra,
            shippingAddress: deliveryMethod === DELIVERY_METHOD.SELF_PICKUP
                ? {}
                : { region, district, city, street, house, apartment, postalCode }
        },
        financials: { defaultPaymentMethod }
    });

    // Проверка на изменение полей
    if (!isDbDataModified(oldCheckoutPrefs, newCheckoutPrefs)) {
        return safeSendResponse(res, 204);
    }
    
    try {
        // Установка и сохранение настроек в базе MongoDB с удалением null-полей и пустых объектов
        await runInDbTransaction(async (session) => {
            dbUser.checkoutPrefs = newCheckoutPrefs;
            await dbUser.save({ session });
            checkTimeout(req);
        });

        safeSendResponse(res, 200, { message: 'Настройки заказа обновлены' });
    } catch (err) {
        const error = toError(err);

        if (isMongooseValidationError(error)) {
            const { systemFieldError, fieldErrors } = parseValidationErrors(error, 'checkout');
            if (systemFieldError) return next(systemFieldError);
        
            if (fieldErrors) {
                return safeSendResponse(res, 422, { message: 'Некорректные данные', fieldErrors });
            }
        }

        next(error);
    }
};

/// Выход из сессии ///
export const handleAuthLogoutRequest: RequestHandler<{}, TAuthLogoutResponse> = async (_req, res, next) => {
    try {
        res.clearCookie('accessToken', TOKEN_COOKIE_OPTIONS);
        res.clearCookie('refreshToken', TOKEN_COOKIE_OPTIONS);
        
        safeSendResponse(res, 200, { message: 'Выход выполнен' });
    } catch (err) {
        next(toError(err));
    }
};
