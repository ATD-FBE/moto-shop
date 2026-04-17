import {
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_PROMO_IMAGE_SIZE_MB,
    MAX_PRODUCT_IMAGE_SIZE_MB,
    PRODUCT_FILES_LIMIT,
    PRODUCT_UNITS,
    DELIVERY_METHOD,
    PAYMENT_METHOD,
    REFUND_METHOD,
    BANK_PROVIDER,
    CARD_ONLINE_PROVIDER
} from './constants.js';
import type {
    TAllowedImageMimeType,
    TProductUnit,
    TDeliveryMethod,
    TPaymentMethod,
    TRefundMethod,
    TBankProvider,
    TFieldErrorMessages
} from '@shared/types/index.js';

/// Валидации полей форм ///
export const userNameValidation = /^[\wа-яА-ЯёЁ.-][\wа-яА-ЯёЁ\s.-]{1,28}[\wа-яА-ЯёЁ.-]$/;
export const emailValidation = /^[a-zA-Z0-9]([a-zA-Z0-9_.-]*[a-zA-Z0-9])?@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
export const passwordValidation = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9@#$%^&*!?-]{8,30}$/;
export const adminRegCodeValidation = /^[a-zA-Z0-9@#$%^&*!?-]{1,30}$/;
export const textValidation = /\S+/;
export const naturalValidation = /^\d+$/;
export const decimalValidation = /^\d+(\.\d+)?$/;
export const currencyValidation = /^\d+(?:\.\d{1,2})?$/;
export const currencySignedValidation = /^-?\d+(?:\.\d{1,2})?$/;
export const dateValidation = /^\d{4}-\d{2}-\d{2}$/;
export const slugValidation = /^[a-z0-9_-]{2,}$/;
export const skuValidation = /^[A-Z]{2,5}-\d{2,5}$/;
export const phoneValidation = /^(\+7|8)\d{10}$/;
export const cvcValidation = /^\d{3,4}$/;

export const alwaysPassValidation = (): boolean => true;

export const booleanRequiredValidation = (val: boolean): boolean => val === true;

export const imageValidation = (
    file: File,
    allowedTypes: TAllowedImageMimeType[],
    maxSizeMB: number
): boolean => {
    const allowedTypesRegex = new RegExp(allowedTypes.join('|'));

    if (!allowedTypesRegex.test(file.type)) return false;
    if (file.size > Math.floor(maxSizeMB * 1024 * 1024)) return false;
    return true;
};

export const recipientsValidation = (recipients: string[]): boolean =>
    Array.isArray(recipients) && recipients.length > 0;

export const productUnitValidation = (val: TProductUnit): boolean => PRODUCT_UNITS.includes(val);

export const discountValidation = (val: string | number): boolean => {
    const num = typeof val === 'string' ? Number(val) : val;
    return val !== '' && Number.isInteger(num) && num >= 0 && num <= 100;
};

export const deliveryMethodValidation = (val: TDeliveryMethod): boolean =>
    Object.values(DELIVERY_METHOD).includes(val);

export const paymentMethodValidation = (val: TPaymentMethod): boolean =>
    Object.values(PAYMENT_METHOD).includes(val);

export const refundMethodValidation = (val: TRefundMethod): boolean =>
    Object.values(REFUND_METHOD).includes(val);

export const providerValidation = (val: TBankProvider): boolean =>
    [...Object.values(BANK_PROVIDER), ...Object.values(CARD_ONLINE_PROVIDER)].includes(val);

export const cardNumberValidation = (val: string): boolean => /^\d{16}$/.test(val.replace(/\s/g, ''));

export const expiryDateValidation = (val: string, context: { split: string }): boolean => {
    if (!val) return false;

    const { split } = context;
    const cleanedVal = val.replace(/\s/g, '');
    const parts = cleanedVal.split(split);
    if (parts.length !== 2) return false;

    const [mm, yy] = parts;

    if (!/^(0[1-9]|1[0-2])$/.test(mm)) return false;
    if (!/^\d{2}$/.test(yy)) return false;

    const month = Number(mm);
    const year = Number(yy);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear() % 100;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
};

/// Объект с правилами валидаций для полей каждой сущности ///
export const validationRules = {
    auth: {
        name: userNameValidation,
        email: emailValidation,
        password: passwordValidation,
        confirmPassword: passwordValidation,
        adminRegCode: adminRegCodeValidation,
        newName: userNameValidation,
        newEmail: emailValidation,
        currentPassword: passwordValidation,
        newPassword: passwordValidation,
        confirmNewPassword: passwordValidation
    },
    customer: {
        discount: discountValidation
    },
    news: {
        title: textValidation,
        content: textValidation
    },
    promotion: {
        title: textValidation,
        image: imageValidation,
        description: textValidation,
        startDate: dateValidation,
        endDate: dateValidation
    },
    notification: {
        recipients: recipientsValidation,
        subject: textValidation,
        message: textValidation,
        signature: textValidation
    },
    category: {
        name: textValidation,
        slug: slugValidation,
        order: naturalValidation,
        parent: alwaysPassValidation // select с динамическими вычисленными options или output
    },
    product: {
        images: imageValidation,
        sku: skuValidation,
        name: textValidation,
        brand: textValidation,
        description: textValidation,
        stock: naturalValidation,
        unit: productUnitValidation,
        price: currencyValidation,
        discount: discountValidation,
        category: alwaysPassValidation, // select с динамически вычисленными options
        tags: textValidation,
        isActive: alwaysPassValidation
    },
    checkout: {
        firstName: textValidation,
        lastName: textValidation,
        middleName: textValidation,
        email: emailValidation,
        phone: phoneValidation,
        deliveryMethod: deliveryMethodValidation,
        allowCourierExtra: alwaysPassValidation,
        region: textValidation,
        district: textValidation,
        city: textValidation,
        street: textValidation,
        house: textValidation,
        apartment: textValidation,
        postalCode: textValidation,
        defaultPaymentMethod: paymentMethodValidation,
        customerComment: textValidation
    },
    order: {
        firstName: textValidation,
        lastName: textValidation,
        middleName: textValidation,
        email: emailValidation,
        phone: phoneValidation,
        deliveryMethod: deliveryMethodValidation,
        allowCourierExtra: alwaysPassValidation,
        region: textValidation,
        district: textValidation,
        city: textValidation,
        street: textValidation,
        house: textValidation,
        apartment: textValidation,
        postalCode: textValidation,
        defaultPaymentMethod: paymentMethodValidation,
        shippingCost: currencyValidation,
        itemQuantity: naturalValidation,
        editReason: textValidation,
        cancellationReason: textValidation,
        internalNote: textValidation
    },
    financials: {
        amount: currencyValidation,     // Общее поле для payment и refund действий
        transactionId: textValidation,  // Общее поле для payment и refund действий
        failureReason: textValidation,  // Общее поле для payment и refund действий
        eventId: textValidation,
        voidedNote: textValidation
    },
    payment: {
        method: paymentMethodValidation,
        provider: providerValidation,
        amount: currencyValidation,
        transactionId: textValidation,
        markAsFailed: alwaysPassValidation,
        failureReason: textValidation,
        cardNumber: cardNumberValidation,
        cvc: cvcValidation,
        expiryDate: expiryDateValidation
    },
    refund: {
        method: refundMethodValidation,
        provider: providerValidation,
        amount: currencyValidation,
        transactionId: textValidation,
        markAsFailed: alwaysPassValidation,
        failureReason: textValidation,
        externalReference: textValidation
    }
} as const;

/// Сообщения об ошибках полей формы ///
export const fieldErrorMessages: TFieldErrorMessages = {
    auth: {
        name: {
            default: 'Имя (3–30 символов) может включать буквы, цифры, пробелы и знаки _ . -',
            login: 'Неверное имя пользователя',
            unique: 'Пользователь с таким именем уже существует'
        },
        email: {
            default: 'Неверный формат email',
            unique: 'Пользователь с таким email уже существует'
        },
        password: {
            default: 'Пароль (8-30 символов) должен содержать хотя бы одну цифру и букву',
            login: 'Неверный пароль'
        },
        confirmPassword: {
            default: 'Подтверждение пароля не совпадает или указано в неверном формате'
        },
        adminRegCode: {
            default: 'Код администратора указан в неверном формате'
        },
        newName: {
            default: 'Имя (3–30 символов) может включать буквы, цифры, пробелы и знаки _ . -',
            unique: 'Пользователь с таким именем уже существует',
            duplicate: 'Это имя уже привязано к аккаунту'
        },
        newEmail: {
            default: 'Неверный формат email',
            unique: 'Пользователь с таким email уже существует',
            duplicate: 'Этот email уже привязан к аккаунту'
        },
        currentPassword: {
            default: 'Текущий пароль указан неверно'
        },
        newPassword: {
            default: 'Пароль (8-30 символов) должен содержать хотя бы одну цифру и букву',
            duplicate: 'Новый пароль не может быть таким же, как текущий'
        },
        confirmNewPassword: {
            default: 'Подтверждение нового пароля не совпадает или указано в неверном формате'
        }
    },

    customer: {
        discount: {
            default: 'Допустимо целое число от 0 до 100'
        }
    },

    news: {
        title: {
            default: 'Название новости обязательно для заполнения'
        },
        content: {
            default: 'Содержание новости должно быть указано'
        }
    },

    promotion: {
        title: {
            default: 'Название акции обязательно для заполнения'
        },
        image: {
            default: `Изображение не должно превышать ${MAX_PROMO_IMAGE_SIZE_MB} МБ` +
                ' и должно быть в формате ' +
                ALLOWED_IMAGE_MIME_TYPES
                    .map(type => (type.split('/').pop() as string).toUpperCase())
                    .concat('JPG')
                    .sort((a, b) => a.localeCompare(b))
                    .join(', ')
        },
        description: {
            default: 'Описание акции обязательно для заполнения'
        },
        startDate: {
            default: 'Дата начала акции обязательна',
            mismatch: 'Некорректная дата начала акции'
        },
        endDate: {
            default: 'Дата окончания акции обязательна',
            mismatch: 'Некорректная дата окончания акции',
            rangeError: 'Дата окончания акции не может быть раньше даты её начала'
        }
    },

    notification: {
        recipients: {
            default: 'Необходимо указать хотя бы один ID получателя',
            mismatch: 'ID получателей отсутствуют или не соответствуют формату'
        },
        subject: {
            default: 'Тема уведомления обязательна для заполнения'
        },
        message: {
            default: 'Содержание уведомления должно быть указано'
        },
        signature: {
            default: 'Отправитель уведомления должен быть указан'
        }
    },

    category: {
        name: {
            default: 'Название категории обязательно для заполнения'
        },
        slug: {
            default: 'Адрес категории (от 2 символов): строчные латинские буквы, цифры и знаки _ -',
            unique: 'Такой адрес уже существует'
        },
        order: {
            default: 'Некорректный номер категории'
        },
        parent: {     // Всегда валидно
            default: ''
        }
    },
    
    product: {
        images: {
            default: `Максимум ${PRODUCT_FILES_LIMIT} фотографий. ` +
                `Каждый файл должен не превышать ${MAX_PRODUCT_IMAGE_SIZE_MB} МБ и быть в формате ` +
                ALLOWED_IMAGE_MIME_TYPES
                    .map(type => (type.split('/').pop() as string).toUpperCase())
                    .concat('JPG')
                    .sort((a, b) => a.localeCompare(b))
                    .join(', ')
        },
        sku: {
            default: 'Артикул должен быть в формате: 2-5 заглавных латинских букв, дефис, 2-5 цифр' +
                ' (от AA-00 до ZZZZZ-99999)',
            unique: 'Товар с таким артикулом уже существует'
        },
        name: {
            default: 'Наименование товара обязательно для заполнения'
        },
        brand: {        // Опциональное поле
            default: ''
        },
        description: {  // Опциональное поле
            default: ''
        },
        unit: {
            default: 'Некорректная товарная единица'
        },
        stock: {
            default: 'Допустимо целое число от 0'
        },
        price: {
            default: 'Некорректная цена'
        },
        discount: {
            default: 'Допустимо целое число от 0 до 100'
        },
        category: {     // Всегда валидно
            default: ''
        },
        tags: {
            default: 'Теги должны разделяться запятой или запятой с пробелом'
        },
        isActive: {
            default: 'Некорректное значение статуса доступности товара'
        }
    },

    checkout: {
        firstName: {
            default: 'Имя обязательно для заполнения'
        },
        lastName: {
            default: 'Фамилия обязательна для заполнения'
        },
        middleName: {   // Опциональное поле
            default: ''
        },
        email: {
            default: 'Неверный формат email'
        },
        phone: {
            default: 'Номер телефона должен быть в формате +7 (xxx) xxx-xx-xx или 8 (xxx) xxx-xx-xx ' +
                '(без пробелов, скобок и дефисов)'
        },
        deliveryMethod: {
            default: 'Необходимо выбрать способ доставки'
        },
        allowCourierExtra: { // Всегда валидно
            default: ''
        },
        region: {       // Опциональное поле
            default: ''
        },
        district: {     // Опциональное поле
            default: ''
        },
        city: {
            default: 'Город обязателен для заполнения'
        },
        street: {
            default: 'Улица обязательна для заполнения'
        },
        house: {
            default: 'Номер дома обязателен для заполнения'
        },
        apartment: {    // Опциональное поле
            default: ''
        },
        postalCode: {   // Опциональное поле
            default: ''
        },
        defaultPaymentMethod: {
            default: 'Необходимо выбрать способ оплаты'
        },
        customerComment: { // Опциональное поле
            default: ''
        }
    },

    order: {
        firstName: {
            default: 'Имя обязательно для заполнения'
        },
        lastName: {
            default: 'Фамилия обязательна для заполнения'
        },
        middleName: {   // Опциональное поле
            default: ''
        },
        email: {
            default: 'Неверный формат email'
        },
        phone: {
            default: 'Номер телефона должен быть в формате +7 (xxx) xxx-xx-xx или 8 (xxx) xxx-xx-xx ' +
                '(без пробелов, скобок и дефисов)'
        },
        deliveryMethod: {
            default: 'Необходимо выбрать способ доставки'
        },
        allowCourierExtra: { // Всегда валидно
            default: ''
        },
        region: {       // Опциональное поле
            default: ''
        },
        district: {     // Опциональное поле
            default: ''
        },
        city: {
            default: 'Город обязателен для заполнения'
        },
        street: {
            default: 'Улица обязательна для заполнения'
        },
        house: {
            default: 'Номер дома обязателен для заполнения'
        },
        apartment: {    // Опциональное поле
            default: ''
        },
        postalCode: {   // Опциональное поле
            default: ''
        },
        defaultPaymentMethod: {
            default: 'Необходимо выбрать способ оплаты'
        },
        shippingCost: {
            default: 'Некорректное значение'
        },
        itemQuantity: {
            default: 'Некоррект. кол-во'
        },
        editReason: {
            default: 'Причина изменений обязательна для заполнения'
        },
        cancellationReason: {
            default: 'Обязательно к заполнению'
        },
        internalNote: {  // Опциональное поле
            default: ''
        }
    },

    financials: {
        amount: {        // Общее поле при оплате/возврате для проверки в схеме Mongoose
            default: 'Некорректная сумма'
        },
        transactionId: { // Общее поле при оплате/возврате для проверки в схеме Mongoose
            default: 'Некорректный ID транзакции'
        },
        failureReason: { // Общее поле при оплате/возврате для проверки в схеме Mongoose
            default: 'Некорректная причина неуспеха'
        },
        eventId: {
            default: 'Некорректный ID финансового события'
        },
        voidedNote: {    // Опциональное поле
            default: ''
        }
    },

    payment: {
        method: {
            default: 'Необходимо выбрать способ оплаты',
            mismatch: 'Некорректный способ оплаты'
        },
        provider: {
            default: 'Некорректный провайдер',
        },
        amount: {
            default: 'Некорректная сумма оплаты'
        },
        transactionId: {
            default: 'ID транзакции оплаты обязателен',
            mismatch: 'Некорректный ID транзакции оплаты'
        },
        markAsFailed: {
            default: 'Некорректное значение флага'
        },
        failureReason: { // Опциональное поле
            default: ''
        },
        cardNumber: {
            default: 'Некорректный номер карты'
        },
        cvc: {
            default: 'Некорректный CVC'
        },
        expiryDate: {
            default: 'Неверный срок действия'
        }
    },
    
    refund: {
        method: {
            default: 'Необходимо выбрать способ возврата',
            mismatch: 'Некорректный способ возврата'
        },
        provider: {
            default: 'Некорректный источник возврата',
        },
        amount: {
            default: 'Некорректная сумма возврата'
        },
        transactionId: {
            default: 'ID транзакции возврата обязателен',
            mismatch: 'Некорректный ID транзакции возврата'
        },
        markAsFailed: {
            default: 'Некорректное значение флага'
        },
        failureReason: { // Опциональное поле
            default: ''
        },
        externalReference: { // Опциональное поле
            default: ''
        }
    }
} as const;

export const DEFAULT_FIELD_ERROR_MESSAGE = 'Некорректный формат данных';
