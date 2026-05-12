import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    orderDraftSyncSchema,
    orderDraftCreateSchema,
    orderDraftUpdateSchema,
} from '@server/validation/schemas/checkout.schemas.js';
import {
    handleOrderDraftSyncRequest,
    handleOrderDraftCreateRequest,
    handleOrderDraftConfirmRequest,
    handleOrderDraftUpdateRequest,
    handleOrderDraftDeleteRequest
} from '@server/controllers/checkoutController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { CUSTOMER } = USER_ROLE;

router.post(
    '/:orderId/sync',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderDraftSyncSchema),
    handleOrderDraftSyncRequest
);
router.post(
    '/:orderId/confirm',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleOrderDraftConfirmRequest
);
router.post(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderDraftCreateSchema),
    handleOrderDraftCreateRequest
);
router.patch(
    '/:orderId',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderDraftUpdateSchema),
    handleOrderDraftUpdateRequest
);
router.delete(
    '/:orderId',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleOrderDraftDeleteRequest
);

export default router;
