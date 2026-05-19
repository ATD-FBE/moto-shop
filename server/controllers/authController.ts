import jwt from 'jsonwebtoken';
import User from '@server/db/models/User.js';
import config from '@server/config/config.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareUser, prepareSession, prepareCheckoutPrefs } from '@server/services/authService.js';
import { generateToken, getTokenExpiryFromCookie } from '@server/utils/tokenUtils.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import { isTokenDecodedUser, requireDbUser, isMongooseValidationError } from '@server/utils/typeGuards.js';
import { normalizeInputDataToNull } from '@server/utils/normalizeUtils.js';
import { isDbDataModified } from '@server/utils/compareUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import {
    TOKEN_COOKIE_OPTIONS,
    ACCESS_TOKEN_MAX_AGE,
    REFRESH_TOKEN_MAX_AGE
} from '@server/config/constants.js';
import { fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { toError } from '@shared/commonHelpers.js';
import { USER_ROLE, DELIVERY_METHOD } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { TDbUser } from '@server/types/index.js';
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
    TEntityField,
    TFieldErrors
} from '@shared/types/index.js';

/// Регистрация ///
export const handleAuthRegistrationRequest: RequestHandler<
    {},
    TAuthRegistrationResponse,
    IAuthRegistrationBody
> = async (req, res, next) => {
    const { formFields, guestCart } = req.body;
    const { name, email, password, adminRegCode } = formFields;

    const isAdmin = !!adminRegCode && adminRegCode === config.adminRegCode;
    const role = isAdmin ? USER_ROLE.ADMIN : USER_ROLE.CUSTOMER;

    try {
        const { newDbUser, sessionData } = await runInDbTransaction(async (session) => {
            // Создание документа нового пользователя
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

            // Дополнение документа пользователя данными о сессии
            const sessionData = await prepareSession(newDbUser.toObject(), guestCart);
            checkTimeout(req);
    
            // Сохранение дкоумента нового пользователя
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
        next(err);
    }
};

/// Авторизация ///
export const handleAuthLoginRequest: RequestHandler<
    {},
    TAuthLoginResponse,
    IAuthLoginBody
> = async (req, res, next) => {
    const { formFields, guestCart } = req.body;
    const { name, password, rememberMe } = formFields;

    const INVALID_AUTH_MSG = 'Некорректные данные при авторизации';
    const fieldErrors: TFieldErrors<'auth'> = {};

    try {
        const { dbUser, sessionData } = await runInDbTransaction(async (session) => {
            // Поиск пользователя
            const dbUser = await User.findOne({ name: name.trim() }).session(session);
            checkTimeout(req);

            if (!dbUser) {
                fieldErrors.name = fieldErrorMessages.auth.name.login;
                throw createAppError<TAuthLoginResponse, 401>(401, INVALID_AUTH_MSG, { fieldErrors });
            }

            // Проверка пароля
            const isPasswordCorrect = await dbUser.comparePassword(password);
            checkTimeout(req);

            if (!isPasswordCorrect) {
                fieldErrors.password = fieldErrorMessages.auth.password.login;
                throw createAppError<TAuthLoginResponse, 401>(401, INVALID_AUTH_MSG, { fieldErrors });
            }

            // Получение данных сессии
            const sessionData = await prepareSession(dbUser.toObject(), guestCart);
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
        next(err);
    }
};

/// Изменение данных пользователя ///
export const handleAuthUserUpdateRequest: RequestHandler<
    {},
    TAuthUserUpdateResponse,
    IAuthUserUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const { newName, newEmail, currentPassword, newPassword } = req.body;

    if ([newName, newEmail, newPassword].every(field => field === undefined)) {
        return safeSendResponse(res, 204);
    }
    
    const dbUser = req.dbUser;
    const prepDbFields: IAuthUserUpdateBody = {
        newName: newName?.trim(),
        newEmail: newEmail?.trim(),
        currentPassword,
        newPassword
    };
    const updatedFormFields: Partial<TEntityField<'auth'>>[] = [];
    const fieldErrors: TFieldErrors<'auth'> = {};

    try {
        const { userData } = await runInDbTransaction(async (session) => {
            // Валидация пароля
            if (newPassword !== undefined) {
                if (currentPassword === undefined) {
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
            }

            // Предварительное обновление остальных полей
            const dbUserBackup: Pick<TDbUser, 'name' | 'email'> = {
                name: dbUser.name,
                email: dbUser.email
            };
            const dbFieldToFormFieldMap: Record<keyof typeof dbUserBackup, keyof IAuthUserUpdateBody> = {
                name: 'newName',
                email: 'newEmail'
            };

            for (const [dbField, formField] of Object.entries(dbFieldToFormFieldMap) as [
                keyof typeof dbUserBackup,
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
                            
                            const errorMessageType = error.errors[safeDbField]?.kind === 'unique'
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
        const hasUpdates = updatedFormFields.length > 0;
        const hasErrors  = Object.keys(fieldErrors).length > 0;
    
        switch (true) {
            case !hasUpdates && hasErrors:
                return safeSendResponse(res, 422, {
                    message: 'Ошибки в данных. Изменения не применены',
                    fieldErrors
                });
            case hasUpdates && hasErrors:
                return safeSendResponse(res, 207, {
                    message: 'Данные пользователя частично обновлены',
                    fieldErrors,
                    updatedFormFields,
                    updatedUser: userData
                });
            case hasUpdates && !hasErrors:
                return safeSendResponse(res, 200, {
                    message: 'Данные пользователя обновлены',
                    updatedFormFields,
                    updatedUser: userData
                });
            default: // !hasUpdates && !hasErrors
                return safeSendResponse(res, 204);
        }
    } catch (err) {
        next(err);
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
    const guestCart = req.body.guestCart;

    try {
        const { sessionData } = await runInDbTransaction(async (session) => {
            const sessionData = await prepareSession(dbUser.toObject(), guestCart);
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
        next(err);
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

        const jwtErrors: Record<string, string> = {
            TokenExpiredError: 'Срок действия токена обновления истёк',
            JsonWebTokenError: 'Неверный токен обновления',
            NotBeforeError: 'Токен обновления ещё не активен',
        };
    
        if (error.name in jwtErrors) {
            return safeSendResponse(res, 401, { message: jwtErrors[error.name] ?? 'JWT Error' });
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
        checkoutPrefs: prepareCheckoutPrefs(req.dbUser.checkoutPrefs)
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
    const {
        firstName, lastName, middleName, email, phone,
        deliveryMethod, allowCourierExtra,
        region, district, city, street, house, apartment, postalCode,
        defaultPaymentMethod
    } = req.body;

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
        next(err);
    }
};

/// Выход из сессии ///
export const handleAuthLogoutRequest: RequestHandler<{}, TAuthLogoutResponse> = async (_req, res, next) => {
    try {
        res.clearCookie('accessToken', TOKEN_COOKIE_OPTIONS);
        res.clearCookie('refreshToken', TOKEN_COOKIE_OPTIONS);
        
        safeSendResponse(res, 200, { message: 'Выход выполнен' });
    } catch (err) {
        next(err);
    }
};
