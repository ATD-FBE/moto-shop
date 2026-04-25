import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    customerListSchema,
    customerOrderListSchema,
    customerDiscountUpdateSchema,
    customerBanStatusUpdateSchema
} from '@server/validation/schemas/customer.schemas.js';
import {
    handleCustomerListRequest,
    handleCustomerOrderListRequest,
    handleCustomerDiscountUpdateRequest,
    handleCustomerBanStatusUpdateRequest
} from '@server/controllers/customerController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(customerListSchema),
    handleCustomerListRequest
);
router.get(
    '/:customerId/orders',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(customerOrderListSchema),
    handleCustomerOrderListRequest
);
router.patch(
    '/:customerId/discount',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(customerDiscountUpdateSchema),
    handleCustomerDiscountUpdateRequest
);
router.patch(
    '/:customerId/ban',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(customerBanStatusUpdateSchema),
    handleCustomerBanStatusUpdateRequest
);

export default router;
