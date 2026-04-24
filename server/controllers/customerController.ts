import { Types } from 'mongoose';
import User from '@server/db/models/User.js';
import Order from '@server/db/models/Order.js';
import { DEFAULT_SEARCH_TYPE, AGGREGATE_COLLATION_OPTIONS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareOrder } from '@server/services/orderService.js';
import {
    buildSearchMatch,
    buildFilterMatch,
    buildPaginatedPipeline,
    buildOrderedFiltersPipeline
} from '@server/utils/aggregationUtils.js';
import { validateObjectFields } from '@server/validation/validationEngine.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { customersFilterOptions } from '@shared/filterOptions.js';
import { customersSortOptions } from '@shared/sortOptions.js';
import { customersPageLimitOptions } from '@shared/pageLimitOptions.js';
import { validationRules, fieldErrorMessages } from '@shared/fieldRules.js';
import { ORDER_STATUS } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { FilterQuery, PipelineStage } from 'mongoose';
import type { TDbUser } from '@server/types/index.js';
import type {
    TCustomerListQuery,
    TCustomerListResponse,
    TCustomerListFilterQuery,
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICustomerListAggregateResult {
    filteredCustomerIdList: {
        _id: Types.ObjectId;
        name: string;
    }[];
  
    paginatedCustomerList: {
        id: string;
        name: string;
        email: string;
        discount: number;
        totalSpent: number;
        createdAt: Date;
        isBanned: boolean;
    }[];
}

interface ICustomerParams extends ParamsDictionary {
    customerId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка ID всех отфильтрованных клиентов и их данных для одной страницы ///
export const handleCustomerListRequest: RequestHandler<
    {},
    TCustomerListResponse,
    {},
    TCustomerListQuery
> = async (req, res, next) => {
    // Настройка фильтра поиска
    const allowedSearchFields = ['name', 'email'] as const;
    const searchMatch = buildSearchMatch<TDbUser>(
        req.query.search,
        allowedSearchFields,
        DEFAULT_SEARCH_TYPE
    );

    // Настройка фильтра по параметрам
    const filterMatch = buildFilterMatch<TDbUser, TCustomerListFilterQuery>(
        req.query,
        customersFilterOptions
    );
    filterMatch.role = 'customer';

    // Пайплайн вывода ID всех отфильтрованных результатов
    const filteredPipeline: PipelineStage.FacetPipelineStage[] = [{ $project: { _id: 1, name: 1 } }];

    // Пайплайн вывода результатов на странице
    const paginatedPipeline = buildPaginatedPipeline<TDbUser>(
        req.query,
        customersSortOptions,
        customersPageLimitOptions
    );

    paginatedPipeline.push({
        $project: {
            _id: 0, // Иначе добавляется автоматически
            id: '$_id',
            name: 1,
            email: 1,
            discount: 1,
            totalSpent: 1,
            createdAt: 1,
            isBanned: 1
        }
    });

    // Установка порядка всех фильтров в зависимости от типа поиска
    const allFiltersPipeline = buildOrderedFiltersPipeline({ searchMatch, filterMatch });

    // Сборка пайплайна для агрегатора
    const pipeline = [
        ...allFiltersPipeline, // Фильтры
        {
            $facet: { // Сбор результатов
                filteredCustomerIdList: filteredPipeline,
                paginatedCustomerList: paginatedPipeline
            }
        }
    ];

    try {
        // Агрегатный запрос с информацией для отладки
        //const explainResult = await User.aggregate(pipeline).explain('executionStats');
        //console.dir(explainResult.stages[0].$cursor, { depth: null });

        // Агрегатный запрос
        const aggregateResult = await User
            .aggregate<ICustomerListAggregateResult>(pipeline)
            .collation(AGGREGATE_COLLATION_OPTIONS);
        checkTimeout(req);
        
        const filteredCustomerNamesMap = Object.fromEntries(
            aggregateResult[0]?.filteredCustomerIdList.map(c => [c._id.toString(), c.name]) || []
        );
        const paginatedCustomerList = aggregateResult[0]?.paginatedCustomerList.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString()
        }));

        safeSendResponse(res, 200, {
            message: 'Данные клиентов успешно загружены',
            filteredCustomerNamesMap,
            paginatedCustomerList
        });
    } catch (err) {
        next(err);
    }
};

/// Загрузка заказов клиента в таблице ///
export const handleCustomerOrderListRequest = async (req, res, next) => {
    const dbUser = req.dbUser;
    const customerId = req.params.customerId;
    const firstOrderId = req.query.firstOrderId;
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const limit = Math.max(parseInt(req.query.limit, 10) || 0, 0);

    const validationConfigMap = {
        customerId: { value: customerId, type: 'objectId' },
        firstOrderId: { value: firstOrderId, type: 'objectId', optional: true }
    };

    const { invalidInputPaths } = validateObjectFields(validationConfigMap);

    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidPathsStr}` });
    }

    try {
        const matchFilter = { 
            customerId: Types.ObjectId.createFromHexString(customerId), 
            currentStatus: { $ne: ORDER_STATUS.DRAFT }
        };
        let needFullReload = false;

        // Проверка ID первого загруженного заказа при дозагрузке следующей порции заказов
        if (firstOrderId) {
            const firstOrder = await Order.findOne(matchFilter)
                .select('_id')
                .sort({ confirmedAt: -1 })
                .lean();
            checkTimeout(req);
        
            if (!firstOrder || firstOrder._id.toString() !== firstOrderId) {
                needFullReload = true;
            }
        }

        const totalCustomerOrders = await Order.countDocuments(matchFilter);
        checkTimeout(req);

        const effectiveSkip = needFullReload ? 0 : skip;
        const effectiveLimit = needFullReload && limit > 0 ? skip + limit : limit;

        const dbCustomerOrderList = await Order.find(matchFilter)
            .sort({ confirmedAt: -1 })
            .skip(effectiveSkip)
            .limit(effectiveLimit)
            .lean();
        checkTimeout(req);

        const customerOrderList = dbCustomerOrderList.map(dbOrder => prepareOrder(dbOrder, {
            inList: true,
            managed: false,
            details: false,
            viewerRole: dbUser.role
        }));

        safeSendResponse(res, 200, {
            message: 'Заказы клиента успешно загружены',
            totalCustomerOrders,
            customerOrderList,
            needFullReload
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение скидки клиента ///
export const handleCustomerDiscountUpdateRequest = async (req, res, next) => {
    const customerId = req.params.customerId;
    const { discount } = req.body ?? {};

    const validationConfigMap = {
        customerId: { value: customerId, type: 'objectId' },
        discount: { value: discount, type: 'number', formField: true }
    };

    const { invalidInputPaths, fieldErrors } = validateObjectFields(validationConfigMap, 'customer');

    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidPathsStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    const discountNum = Number(discount);
    const discountValidator = validationRules.customer.discount;

    if (!discountValidator || !discountValidator(discountNum)) {
        return safeSendResponse(res, 422, {
            message: 'Некорректное значение поля',
            fieldErrors: {
                discount: fieldErrorMessages.customer.discount?.default || fieldErrorMessages.DEFAULT
            }
        });
    }

    try {
        const { customerLbl } = await runInDbTransaction(async (session) => {
            const dbCustomer = await User.findByIdAndUpdate(
                customerId,
                { discount: discountNum },
                { new: true, session }
            );
            checkTimeout(req);

            const customerLbl = dbCustomer ? dbCustomer.name : `(ID: ${customerId})`;
    
            if (!dbCustomer) {
                throw createAppError(404, `Клиент ${customerLbl} не найден`);
            }

            return { customerLbl };
        });

        safeSendResponse(res, 200, {
            message: `Скидка клиента ${customerLbl} успешно изменена на ${discountNum}%`,
            customerUpdateData: { discount: discountNum }
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение статуса блокировки клиента ///
export const handleCustomerBanToggleRequest = async (req, res, next) => {
    const customerId = req.params.customerId;
    const { newBanStatus } = req.body ?? {};

    const validationConfigMap = {
        customerId: { value: customerId, type: 'objectId' },
        newBanStatus: { value: newBanStatus, type: 'boolean' }
    };

    const { invalidInputPaths } = validateObjectFields(validationConfigMap);

    if (invalidInputPaths.length > 0) {
        const invalidPathsStr = invalidInputPaths.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidPathsStr}` });
    }

    try {
        const { customerLbl } = await runInDbTransaction(async (session) => {
            const dbCustomer = await User.findByIdAndUpdate(
                customerId,
                { isBanned: newBanStatus },
                { new: true, session }
            );
            checkTimeout(req);
        
            const customerLbl = dbCustomer ? dbCustomer.name : `(ID: ${customerId})`;
    
            if (!dbCustomer) {
                throw createAppError(404, `Клиент ${customerLbl} не найден`);
            }

            return { customerLbl };
        });

        const banStatusText = newBanStatus ? 'заблокирован' : 'разблокирован';

        safeSendResponse(res, 200, {
            message: `Статус блокировки клиента ${customerLbl}: ${banStatusText}`,
            customerUpdateData: { isBanned: newBanStatus }
        });
    } catch (err) {
        next(err);
    }
};
