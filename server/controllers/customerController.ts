import { Types } from 'mongoose';
import User from '@server/db/models/User.js';
import Order from '@server/db/models/Order.js';
import { DEFAULT_SEARCH_TYPE, AGGREGATE_COLLATION_OPTIONS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareCustomer } from '@server/services/customerService.js';
import { prepareOrder } from '@server/services/orderService.js';
import {
    buildSearchMatch,
    buildFilterMatch,
    buildPaginatedPipeline,
    buildOrderedFiltersPipeline
} from '@server/utils/aggregationUtils.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { customersFilterOptions } from '@shared/filterOptions.js';
import { customersSortOptions } from '@shared/sortOptions.js';
import { customersPageLimitOptions } from '@shared/pageLimitOptions.js';
import { USER_ROLE, ORDER_STATUS } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { PipelineStage } from 'mongoose';
import type { TDbUser, TDbOrderFinal } from '@server/types/index.js';
import type {
    TCustomerListQuery,
    TCustomerListResponse,
    TCustomerListFilterParams,
    ICustomerOrderListQuery,
    TCustomerOrderListResponse,
    ICustomerDiscountUpdateBody,
    TCustomerDiscountUpdateResponse,
    ICustomerBanStatusUpdateBody,
    TCustomerBanStatusUpdateResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICustomerListAggregateResult {
    filteredCustomerIdList: {
        _id: Types.ObjectId;
        name: string;
    }[];
    paginatedCustomerList: TDbUser[];
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
    const filterMatch = buildFilterMatch<TDbUser, TCustomerListFilterParams>(
        req.query,
        customersFilterOptions
    );
    filterMatch.role = USER_ROLE.CUSTOMER;

    // Пайплайн вывода ID всех отфильтрованных результатов
    const filteredPipeline: PipelineStage.FacetPipelineStage[] = [{ $project: { _id: 1, name: 1 } }];

    // Пайплайн вывода результатов на странице
    const paginatedPipeline = buildPaginatedPipeline<TDbUser>(
        req.query,
        customersSortOptions,
        customersPageLimitOptions
    );

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
        const paginatedCustomerList = aggregateResult[0]?.paginatedCustomerList.map(c =>
            prepareCustomer(c)
        ) || [];

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
export const handleCustomerOrderListRequest: RequestHandler<
    ICustomerParams,
    TCustomerOrderListResponse,
    {},
    ICustomerOrderListQuery
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const customerId = req.params.customerId;
    const firstOrderId = req.query.firstOrderId;
    const skip = Math.max(parseInt(req.query.skip ?? '0', 10), 0);
    const limit = Math.max(parseInt(req.query.limit ?? '0', 10), 0);

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
                .lean<TDbOrderFinal>();
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
            .lean<TDbOrderFinal[]>();
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
export const handleCustomerDiscountUpdateRequest: RequestHandler<
    ICustomerParams,
    TCustomerDiscountUpdateResponse,
    ICustomerDiscountUpdateBody
> = async (req, res, next) => {
    const customerId = req.params.customerId;
    const { discount } = req.body;

    try {
        const dbCustomer = await User.findByIdAndUpdate(
            customerId,
            { discount },
            { new: true }
        );
        checkTimeout(req);

        const customerLbl = dbCustomer ? dbCustomer.name : `(ID: ${customerId})`;

        if (!dbCustomer) {
            return safeSendResponse(res, 404, { message: `Клиент ${customerLbl} не найден` });
        }

        safeSendResponse(res, 200, {
            message: `Скидка клиента ${customerLbl} успешно изменена на ${discount}%`,
            customerUpdateData: { discount }
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение статуса блокировки клиента ///
export const handleCustomerBanStatusUpdateRequest: RequestHandler<
    ICustomerParams,
    TCustomerBanStatusUpdateResponse,
    ICustomerBanStatusUpdateBody
> = async (req, res, next) => {
    const customerId = req.params.customerId;
    const { newBanStatus } = req.body;

    try {
        const dbCustomer = await User.findByIdAndUpdate(
            customerId,
            { isBanned: newBanStatus },
            { new: true }
        );
        checkTimeout(req);
    
        const customerLbl = dbCustomer ? dbCustomer.name : `(ID: ${customerId})`;

        if (!dbCustomer) {
            return safeSendResponse(res, 404, { message: `Клиент ${customerLbl} не найден` });
        }

        const banStatusText = newBanStatus ? 'заблокирован' : 'разблокирован';

        safeSendResponse(res, 200, {
            message: `Статус блокировки клиента ${customerLbl}: ${banStatusText}`,
            customerUpdateData: { isBanned: newBanStatus }
        });
    } catch (err) {
        next(err);
    }
};
