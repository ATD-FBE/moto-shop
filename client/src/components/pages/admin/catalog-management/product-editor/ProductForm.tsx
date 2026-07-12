import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import ImageUploader from '@/components/common/ImageUploader.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import useSyncedStateWithRef from '@/hooks/useSyncedStateWithRef.js';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendProductCreateRequest, sendProductUpdateRequest } from '@/api/productRequests.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { openImageViewerModal } from '@/services/modalImageViewerService.js';
import {
    getLockedStatuses,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue,
    getBoolValue
} from '@/helpers/formHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toKebabCase, formatProductTitle, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    PRODUCT_FILES_LIMIT,
    MAX_PRODUCT_IMAGE_SIZE_MB,
    UNSORTED_CATEGORY_SLUG,
    PRODUCT_UNITS
} from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    TextareaHTMLAttributes,
    SelectHTMLAttributes
} from 'react';
import type {
    TLeafCategories,
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    TFieldStateValue,
    TFieldApiValue,
    IFieldConfig,
    IFieldState,
    IImageUpload,
    TAppThunk,
    IProcessFormFieldsResult,
    TProductPerformFormSubmission,
    TProductPerformFormSubmissionResult
} from '@/types/index.js';
import type {
    IProduct,
    IProductImage,
    TEntityField,
    TValidationRuleType,
    TProductCreateBodyClient,
    TProductUpdateBodyClient,
    TProductCreateResponse,
    TProductUpdateResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'product'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

interface IPrepareExistingImagesProps {
    images?: IProductImage[];
    title?: string;
    mainImageIndex?: number;
}

interface IPrepareNewImagesProps {
    files: File[];
    currentImages: IImageUpload[];
    title?: string;
}

interface IProductFormProps {
    product: IProduct | null;
    allowedCategories: TLeafCategories;
    onSubmit: (performFormSubmission: TProductPerformFormSubmission) => Promise<void>;
    uiBlocked: boolean;
}

type TProductBody = TProductCreateBodyClient | TProductUpdateBodyClient;
type TProductCommonBodyKeys = keyof (TProductCreateBodyClient & TProductUpdateBodyClient);
type TFieldEntries = [TProductCommonBodyKeys, TFieldApiValue][];

interface IProcessFieldResult {
    isValid: boolean;
    fieldStateValue: {
        files?: File[];
        value?: TFieldStateValue;
    };
    fieldEntries: TFieldEntries;
    isValueChanged: boolean;
}

type TApiFormFields = {
    [K in TProductCommonBodyKeys]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> & 
    TextareaHTMLAttributes<HTMLTextAreaElement> &
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
            mainMessage: 'Исходный товар или связанный с ним ресурс не найден.'
        },
        [UNCHANGED]: { ...base[UNCHANGED], addMessage: 'Товар не изменён.', submitBtnLabel: actionLabel },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: isEditMode ? 'Товар обновлён.' : 'Новый товар добавлен!',
            addMessage: 'Список товаров будет обновлён.',
            submitBtnLabel: 'Выполнено'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const getFieldConfigs = (
    isEditMode: boolean,
    product: IProduct | null,
    allowedCategories: TLeafCategories
) => {
    const initCategory = product
        ? allowedCategories.find(cat => cat.id === product.category)
        : allowedCategories.find(cat => cat.slug === UNSORTED_CATEGORY_SLUG);

    const fieldConfigs = [
        {
            name: 'images',
            label: 'Фотографии',
            elem: 'input',
            type: 'file',
            multiple: true,
            filesLimit: PRODUCT_FILES_LIMIT,
            accept: ALLOWED_IMAGE_MIME_TYPES.join(', '),
            allowedTypes: ALLOWED_IMAGE_MIME_TYPES,
            maxSizeMB: MAX_PRODUCT_IMAGE_SIZE_MB,
            optional: true
        },
        {
            name: 'sku',
            label: 'Артикул',
            elem: 'input',
            type: 'text',
            placeholder: isEditMode ? 'Укажите новый артикул' : 'Укажите артикул товара',
            defaultValue: product?.sku ?? '',
            autoComplete: 'off',
            trim: true,
            optional: true
        },
        {
            name: 'name',
            label: 'Наименование',
            elem: 'input',
            type: 'text',
            placeholder: isEditMode ? 'Укажите новое наименование' : 'Укажите наименование товара',
            defaultValue: product?.name ?? '',
            trim: true,
            autoComplete: 'off'
        },
        {
            name: 'brand',
            label: 'Бренд',
            elem: 'input',
            type: 'text',
            placeholder: isEditMode ? 'Укажите новый бренд' : 'Укажите бренд товара',
            defaultValue: product?.brand ?? '',
            autoComplete: 'off',
            trim: true,
            optional: true
        },
        {
            name: 'description',
            label: 'Описание',
            elem: 'textarea',
            placeholder: isEditMode ? 'Введите новое описание' : 'Введите описание товара',
            defaultValue: product?.description ?? '',
            autoComplete: 'off',
            trim: true,
            optional: true
        },
        {
            name: 'stock',
            label: 'Количество на складе',
            elem: 'input',
            type: 'number',
            step: 1,
            min: 0,
            defaultValue: product?.stock ?? 0
        },
        {
            name: 'unit',
            label: 'Единица измерения',
            elem: 'select',
            options: PRODUCT_UNITS.map(unit => ({ value: unit, label: unit })),
            defaultValue: product?.unit ?? PRODUCT_UNITS[0]
        },
        {
            name: 'price',
            label: 'Цена (руб.)',
            elem: 'input',
            type: 'number',
            step: 0.01,
            min: 0,
            defaultValue: product?.price ?? 0
        },
        {
            name: 'discount',
            label: 'Уценка (%)',
            elem: 'input',
            type: 'number',
            step: 0.5,
            min: 0,
            max: 100,
            defaultValue: product?.discount ?? 0
        },
        {
            name: 'category',
            label: 'Категория товаров',
            elem: 'select',
            options: allowedCategories.map(cat => ({ value: cat.id, label: cat.name })),
            defaultValue: initCategory?.id ?? (allowedCategories[0]?.id || '')
        },
        {
            name: 'tags',
            label: 'Теги (через запятую)',
            elem: 'input',
            type: 'text',
            placeholder: isEditMode ? 'Укажите новые теги' : 'Укажите теги',
            defaultValue: product?.tags ?? '',
            autoComplete: 'off',
            trim: true,
            optional: true
        },
        {
            name: 'isActive',
            label: 'Активность',
            elem: 'checkbox',
            checkboxLabel: 'Доступен для продажи',
            defaultValue: product?.isActive ?? true
        }
    ] as const satisfies readonly IFieldConfig[];

    return extendFieldConfigs(fieldConfigs);
};

const prepareExistingImages = ({
    images = [],
    title = '',
    mainImageIndex = 0
}: IPrepareExistingImagesProps): IImageUpload[] => {
    return images.map((img, idx) => ({
        type: 'existing',
        filename: img.filename,
        title,
        previewUrl: img.thumbnails.small,
        originalUrl: img.original,
        main: idx === mainImageIndex,
        markedForDeletion: false
    }));
};

const prepareNewImages = ({
    files,
    currentImages = [],
    title = 'Фото нового товара'
}: IPrepareNewImagesProps): IImageUpload[] => {
    const hasMainImage = currentImages.some(img => img.main);

    return Array.from(files).map((file, idx) => {
        const objectUrl = URL.createObjectURL(file);
    
        return {
            type: 'new',
            file,
            title,
            previewUrl: objectUrl,
            originalUrl: objectUrl,
            main: !hasMainImage && idx === 0,
            markedForDeletion: false,
            invalid: false
        };
    });
};

export default function ProductForm(
    { product, allowedCategories, onSubmit, uiBlocked }: IProductFormProps
): JSX.Element {
    const isEditMode = Boolean(product);
    const title = formatProductTitle(product?.name, product?.brand); // Если product нет, вернёт ''

    const { submitStates, lockedStatuses } = useMemo(() => getSubmitStates(isEditMode), [isEditMode]);

    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(isEditMode, product, allowedCategories);
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);
        
        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [isEditMode, product, allowedCategories]);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        createInitialFieldsState<TFieldName>
    );
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const [images, setImages, imagesRef] = useSyncedStateWithRef<IImageUpload[]>(() =>
        prepareExistingImages({
            images: product?.images,
            title,
            mainImageIndex: product?.mainImageIndex
        })
    );
    const imagesFileInputRef = useRef<HTMLInputElement | null>(null);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const isFormLocked = lockedStatuses.has(submitStatus) || uiBlocked;

    const setNewImages = (files: File[]): void => {
        const newImages = prepareNewImages({
            files,
            currentImages: images,
            title
        });

        setImages(prevImages => [...prevImages, ...newImages]);

        // Очистка файлов в инпуте
        if (imagesFileInputRef.current) {
            imagesFileInputRef.current.value = '';
        }
    };

    const handleThumbImageClick = (idx: number): void => {
        dispatch(openImageViewerModal({
            images: images.map(img => ({ url: img.originalUrl, title: img.title })),
            initialIndex: idx
        }));
    };

    const setMainImage = (targetIdx: number): void => {
        setImages(prevImages => prevImages.map((img, idx) => ({ ...img, main: idx === targetIdx })));
    };

    const toggleImageDeletion = (targetIdx: number): void => {
        setImages(prevImages => {
            const newImages = [...prevImages];
            const targetImage = newImages[targetIdx];
            if (!targetImage) return prevImages;
    
            const isDeleting = !targetImage.markedForDeletion;
            const isMain = targetImage.main;
            const isInvalid = targetImage.invalid;

            // Смена флага удаления
            targetImage.markedForDeletion = isDeleting;
            
            if (isDeleting) {
                // При удалении главной картинки - устанавливается главной первая существующая
                if (isMain) {
                    targetImage.main = false;

                    const newMainImage = newImages.find(img => !img.markedForDeletion && !img.invalid);
                    if (newMainImage) newMainImage.main = true;
                }

                // Очистка при удалении сообщения об ошибке поля
                if (isInvalid) {
                    const hasActiveInvalidNewImages = newImages
                        .some(img => img.invalid && !img.markedForDeletion);

                    if (!hasActiveInvalidNewImages) {
                        dispatchFieldsState({
                            type: 'UPDATE',
                            payload: { images: { uiStatus: '', error: '' } }
                        });
                    }
                }
            } else {
                // При отмене удаления и отсутствии главной картинки - установить как главную
                const hasMainImage = newImages.some(img => img.main);
                if (!hasMainImage && !isInvalid) targetImage.main = true;
            }
    
            return newImages;
        });
    };

    const flagInvalidNewImages = (invalidNewImageUrls: Set<string>): void => {
        setImages(prevImages => {
            // Установка флага для всех невалидных картинок и снятие с них флага главной
            const newImages = prevImages.map(img => ({
                ...img,
                ...(invalidNewImageUrls.has(img.previewUrl) && { invalid: true, main: false })
            }));

            // Проверка, остался ли флаг главной картинки после изменения невалидных
            const hasMainImage = newImages.some(img => img.main);

            // Установка новой главной картинки, если таковой не нашлось
            if (!hasMainImage) {
                const newMainImage = newImages.find(img => !img.markedForDeletion && !img.invalid);
                if (newMainImage) newMainImage.main = true;
            }

            return newImages;
        });
    };

    const revokeNewImageObjectUrls = (images: IImageUpload[]): void => {
        images.forEach(img => {
            if (img.type === 'new') {
                URL.revokeObjectURL(img.previewUrl); // Для originalUrl такой же ObjectURL
            }
        });
    };

    const handleAddFilesClick = (): void => {
        imagesFileInputRef.current?.click();
    };

    const handleFilesDrop = (files: File[]): void => {
        setNewImages(files);
    };

    const handleFieldChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const files = 'files' in target ? Array.from(target.files || []) : [];
        const checked = 'checked' in target ? target.checked : false;
        const isImages = name === 'images';
        let processedValue: TFieldStateValue | undefined;
        
        if (type === 'number' && value !== '') {
            processedValue = Number(value.replace(',', '.'))
        } else if (type === 'checkbox') {
            processedValue = checked;
        } else if (type !== 'files') {
            processedValue = value;
        }

        if (isImages && files.length > 0) {
            setNewImages(files);
        }

        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                [name]: {
                    ...(type === 'file' ? { files: [] } : { value: processedValue }),
                    ...(!isImages && { uiStatus: '', error: '' })
                }
            }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processImagesField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        invalidNewImageUrls: Set<string>
    ): IProcessFieldResult => {
        const { filesLimit, allowedTypes, maxSizeMB, optional } = config;
        const fieldStateValue = { files: [] };
        const activeImages = images.filter(img => !img.markedForDeletion);

        if (activeImages.length > (filesLimit ?? 0)) {
            return { isValid: false, fieldStateValue, fieldEntries: [], isValueChanged: false };
        }

        // Проверка и сбор новых файлов фотографий
        const newImages = activeImages.filter(img => img.type === 'new');
        const newImageFiles: File[] = [];
    
        newImages.forEach(img => {
            if (!(img.file instanceof File)) return;

            const isValid = typeof validation === 'function'
                ? validation(img.file, allowedTypes, maxSizeMB)
                : false;
    
            if (isValid) {
                newImageFiles.push(img.file);
            } else {
                invalidNewImageUrls.add(img.previewUrl);
            }
        });
    
        if (invalidNewImageUrls.size > 0 || (!newImageFiles.length && !optional)) {
            return { isValid: false, fieldStateValue, fieldEntries: [], isValueChanged: false };
        }
    
        // Сбор имён существующих файлов фотографий
        const existingImageFilenamesToDelete = images
            .filter(img => img.type === 'existing' && img.markedForDeletion)
            .map(img => img.filename as string);

        // Установка полей для удаляемых и новых фотографий
        const fieldEntries: TFieldEntries = [
            ['imageFilenamesToDelete', existingImageFilenamesToDelete],
            ['images', newImageFiles]
        ];

        // Установка поля индекса главной фотографии
        const oldMainImageIndex = product?.mainImageIndex;
        const newMainImageIndex = activeImages.findIndex(img => img.main);
        
        if (newMainImageIndex !== -1) {
            fieldEntries.push(['mainImageIndex', newMainImageIndex]);
        }

        // Проверка на изменение
        const isValueChanged = Boolean(
            newImages.length > 0 ||
            existingImageFilenamesToDelete.length > 0 ||
            (typeof oldMainImageIndex !== 'number' && newMainImageIndex !== -1) ||
            (typeof oldMainImageIndex === 'number' && newMainImageIndex !== oldMainImageIndex)
        );
    
        return { isValid: true, fieldStateValue, fieldEntries, isValueChanged };
    };

    const processGenericField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        value: TFieldStateValue
    ): IProcessFieldResult => {
        const { name, trim, optional } = config;

        const initValue = product?.[name];
        const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
        const fieldStateValue = { value: normalizedValue };
        const hasValue = normalizedValue !== '';

        const ruleCheck =
            typeof validation === 'function'
                ? validation(normalizedValue)
                : typeof normalizedValue === 'string'
                    ? validation.test(normalizedValue)
                    : false;

        const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;
        const fieldEntries: TFieldEntries = (isValid && (!optional || hasValue))
            ? [[name, normalizedValue]]
            : [];
        const isValueChanged = typeof normalizedValue === 'number' 
            ? normalizedValue !== Number(initValue) 
            : normalizedValue !== (initValue ?? '');
    
        return { isValid, fieldStateValue, fieldEntries, isValueChanged };
    };

    const processFormFields = (): IProcessFormFieldsResult<TFieldName, TProductBody> & {
        invalidNewImageUrls: Set<string>;
    } => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const config = fieldConfigMap[name];
                const validation = validationRules.product[name];

                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                // Валидация значений полей, формирование данных на отправку и проверка на изменение
                const processFieldResult = name === 'images'
                    ? processImagesField(config, validation, acc.invalidNewImageUrls)
                    : processGenericField(config, validation, value);

                const { isValid, fieldStateValue, fieldEntries, isValueChanged } = processFieldResult;
    
                // Сбор данных для обновления состояния поля
                acc.fieldsStateUpdates[name] = {
                    ...fieldStateValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.product[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    // Сбор данных для отправки
                    fieldEntries.forEach(([key, val]) => {
                        (acc.formFields as TApiFormFields)[key] = val;
                    });
                        
                    // Запоминание изменённого поля
                    if (isValueChanged) acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
    
                return acc;
            },
            {
                allValid: true,
                invalidNewImageUrls: new Set() as Set<string>,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as TProductBody,
                changedFields: [] as TFieldName[]
            }
        );

        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        
        const {
            allValid,
            invalidNewImageUrls,
            fieldsStateUpdates,
            formFields,
            changedFields = []
        } = processFormFields();

        if (invalidNewImageUrls.size > 0) flagInvalidNewImages(invalidNewImageUrls);
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (isEditMode && !changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        const performFormSubmission = async (): Promise<
            TProductPerformFormSubmissionResult | undefined
        > => {
            setSubmitStatus(FORM_STATUS.SENDING);
            dispatch(setNavigationLock(true));

            const requestThunk = (
                isEditMode && product
                    ? sendProductUpdateRequest(product.id, formFields as TProductUpdateBodyClient)
                    : sendProductCreateRequest(formFields as TProductCreateBodyClient)
            ) as TAppThunk<Promise<TProductCreateResponse | TProductUpdateResponse>> ;
            const responseData = await dispatch(requestThunk);
            if (isUnmountedRef.current) return;

            const { status, message } = responseData;
            const LOG_CTX = `PRODUCT: ${isEditMode ? 'UPDATE SINGLE' : 'CREATE'}`;

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
            
                case FORM_STATUS.PARTIAL: // Partial нужен для общей типизации c BulkProductForm
                case FORM_STATUS.SUCCESS: {
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

                            // Очистка состояния фотографий
                            revokeNewImageObjectUrls(imagesRef.current);
                            setImages([]);

                            // Очистка всех полей формы в режиме создания
                            // (при редактировании компонента формы размонтируется из-за обновления таблицы)
                            if (!isEditMode) {
                                dispatchFieldsState({
                                    type: 'RESET',
                                    payload: createInitialFieldsState<TFieldName>(fieldConfigs)
                                });
                            }

                            setSubmitStatus(FORM_STATUS.DEFAULT);
                            dispatch(setNavigationLock(false));
                            resolve();
                        }, SUCCESS_DELAY)
                    });

                    const affected = isEditMode && 'updatedProduct' in responseData
                        ? responseData.updatedProduct
                        : 'newProduct' in responseData
                            ? responseData.newProduct
                            : null;
                    return { status, affectedProducts: affected ? [affected] : [] };
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
            revokeNewImageObjectUrls(imagesRef.current);
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
        <form className="product-form" onSubmit={handleFormSubmit} noValidate>
            <header className="form-header">
                <h2>{isEditMode ? 'Редактирование товара' : 'Создание нового товара'}</h2>
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
                    multiple,
                    accept,
                    options,
                    placeholder,
                    checkboxLabel,
                    autoComplete,
                    trim,
                    optional
                }) => {
                    const fieldId = `product-${product?.id ?? 'create'}-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                    const isImages = name === 'images';

                    const baseElemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
                        autoComplete,
                        onChange: handleFieldChange,
                        disabled: isFormLocked,
                    };
    
                    const fieldElem = (() => {
                        if (elem === 'textarea') return (
                            <textarea
                                {...baseElemProps}
                                placeholder={placeholder}
                                value={getStringValue(fieldsState[name]?.value)}
                                onBlur={trim ? handleFieldBlur : undefined}
                            >
                            </textarea>
                        );

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
                                ref={isImages ? imagesFileInputRef : undefined}
                                style={isImages ? { display: 'none' } : undefined}
                                type={type}
                                step={step}
                                min={min}
                                max={max}
                                multiple={multiple}
                                accept={accept}
                                placeholder={placeholder}
                                value={getStringValue(fieldsState[name]?.value)}
                                onBlur={trim ? handleFieldBlur : undefined}
                            />
                        );
                    })();

                    return (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <label htmlFor={fieldId} className="form-entry-label">
                                {label}:
                                {optional && <small className="optional">опционально</small>}
                            </label>

                            <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                {fieldElem}

                                {isImages && (
                                    <ImageUploader
                                        images={images}
                                        onZoom={handleThumbImageClick}
                                        onMainSelect={setMainImage}
                                        onDeleteToggle={toggleImageDeletion}
                                        onAddFilesClick={handleAddFilesClick}
                                        onFilesDropped={handleFilesDrop}
                                        uiBlocked={isFormLocked}
                                    />
                                )}
                                
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
