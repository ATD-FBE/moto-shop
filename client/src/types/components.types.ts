import { CATEGORY_FORM_MODE } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { RefObject, Dispatch, SetStateAction } from 'react';
import type {
    INotification,
    IProduct,
    TAuthErrorStatus,
    TGeneralErrorStatus,
    TSuccessStatus,
    TRequestStatus,
    TCategoryCreateResponse,
    TCategoryUpdateResponse,
    TProductCreateResponse,
    TProductUpdateResponse
} from '@shared/types/index.js';

///////////////
/// TOOLBAR ///
///////////////

export type TToolbarControls = 'limit' | 'sort' | 'search' | 'filter' | 'pages' | 'info';

////////////////
/// CUSTOMER ///
////////////////

export interface IUpdateCustomerDiscountResult {
    success: boolean;
    fieldErrors?: Record<string, string>;
    onComplete: () => void;
}

////////////////////
/// NOTIFICATION ///
////////////////////

interface INotificationCardCommonProps {
    notification: INotification;
    notificationArticleRefs: RefObject<Record<string, HTMLElement | null>>;
    notificationIdsInProgress: Set<string>;
    addNotificationIdInProgress: (notificationId: string) => void;
    removeNotificationIdInProgress: (notificationId: string) => void;
    updateNotificationState: (
        notificationId: string,
        notificationUpdateData: Partial<INotification>
    ) => void;
}

export interface INotificationCardCustomerProps extends INotificationCardCommonProps {}

export interface INotificationCardManagementProps extends INotificationCardCommonProps {
    page: number;
    limit: number;
    totalNotifications: number;
    paginatedNotificationsCount: number;
    setPage: Dispatch<SetStateAction<number>>;
    reloadNotifications: () => Promise<boolean>;
}

export type TRenderNotificationCardProps =
    INotificationCardCustomerProps &
    INotificationCardManagementProps;

export interface INewNotificationAlertProps {
    sort: string;
    page: number;
    limit: number;
    totalNotifications: number;
    setPage: Dispatch<SetStateAction<number>>;
    reloadNotifications: () => Promise<boolean>;
}

////////////////
/// CATEGORY ///
////////////////

export type TLeafCategories = {
    id: string;
    name: string;
    slug: string;
}[];

/// Safe Parent Category Map ///
export interface ISafeParentCategoryOption {
    id: string;
    label: string;
    subcategoriesCount: number;
}
export type TSubcategoryCounts = Record<string, number>;

/// Category Perform Form Submission ///
interface ICategoryPerformFormSubmissionErrorResult {
    status: Exclude<
        TCategoryCreateResponse['status'] | TCategoryUpdateResponse['status'],
        typeof REQUEST_STATUS.SUCCESS
    >
}
interface ICategoryPerformFormSubmissionSuccessResult {
    status: typeof REQUEST_STATUS.SUCCESS;
    finalizeSuccessHandling: () => void;
    newCategoryId?: string;
    movedProductsCount: number;
}
export type TCategoryPerformFormSubmissionResult =
    | ICategoryPerformFormSubmissionErrorResult
    | ICategoryPerformFormSubmissionSuccessResult;

/// Category Form Props ///
interface ICategoryBaseFormProps {
    onSubmit: (
        performFormSubmission: () => Promise<TCategoryPerformFormSubmissionResult | undefined>
    ) => Promise<void>;
    uiBlocked: boolean;
}
export interface ICategoryFormCommonData<T extends string = any> {
    initValues: {
        name: T;
        slug: string;
        order: number;
        parent: string | null
    };
    maxOrder: number;
    isRestricted: boolean;
}
export interface ICategoryCreateFormData<T extends string = any> extends ICategoryFormCommonData<T> {
    mode: typeof CATEGORY_FORM_MODE.CREATE;
    categoryId: null;
    defaultOrder: number;
    parentName: string;
}
export interface ICategoryEditFormData<T extends string = any> extends ICategoryFormCommonData<T> {
    mode: typeof CATEGORY_FORM_MODE.EDIT;
    categoryId: string;
    safeParentData: {
        selectOptions: ISafeParentCategoryOption[];
        subcatCounts: TSubcategoryCounts;
    };
}
export type TCategoryFormProps<T extends string = any> = ICategoryBaseFormProps & (
    ICategoryCreateFormData<T> | ICategoryEditFormData<T>
);

///////////////
/// PRODUCT ///
///////////////

export interface IDeletingProduct {
    id: string;
    name: string;
}

/// Category Perform Form Submission ///
interface IProductPerformFormSubmissionErrorResult {
    status: Exclude<
        TProductCreateResponse['status'] | TProductUpdateResponse['status'],
        TSuccessStatus
    >
}
interface IProductPerformFormSubmissionSuccessResult {
    status: TSuccessStatus;
    affectedProducts?: IProduct[];
}
export type TProductPerformFormSubmissionResult =
    | IProductPerformFormSubmissionErrorResult
    | IProductPerformFormSubmissionSuccessResult;
