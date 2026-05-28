import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    orderListSchema,
    orderSchema,
    orderItemsAvailabilitySchema,
    orderRepeatSchema,
    orderInternalNoteUpdateSchema,
    orderDetailsUpdateSchema,
    orderItemsUpdateSchema,
    orderStatusUpdateSchema,
    orderInvoicePdfSchema,
    orderRemainingAmountSchema,
    orderFinancialsEventVoidSchema,
    orderOfflinePaymentApplySchema,
    orderOfflineRefundApplySchema,
    orderOnlinePaymentCreateSchema,
    orderOnlineRefundsCreateSchema
} from '@server/validation/schemas/order.schemas.js';
import {
    handleOrderListRequest,
    handleOrderRequest,
    handleOrderItemsAvailabilityRequest,
    handleOrderRepeatRequest,
    handleOrderDetailsUpdateRequest,
    handleOrderItemsUpdateRequest,
    handleOrderStatusUpdateRequest,
    handleOrderInternalNoteUpdateRequest
} from '@server/controllers/order/orderCoreController.js';
import {
    handleOrderInvoicePdfRequest,
    handleOrderRemainingAmountRequest,
    handleOrderFinancialsEventVoidRequest,
    handleOrderOfflinePaymentApplyRequest,
    handleOrderOfflineRefundApplyRequest,
    handleOrderOnlinePaymentCreateRequest,
    handleOrderOnlineRefundsCreateRequest,
    handleOrderFinancialsWebhook
} from '@server/controllers/order/orderFinancialsController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN, CUSTOMER),
    validateInput(orderListSchema),
    handleOrderListRequest
);
router.get(
    '/:orderId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN, CUSTOMER),
    validateInput(orderSchema),
    handleOrderRequest
);
router.get(
    '/:orderId/items/availability',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderItemsAvailabilitySchema),
    handleOrderItemsAvailabilityRequest
);
router.get(
    '/:orderId/financials/invoice/pdf',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN, CUSTOMER),
    validateInput(orderInvoicePdfSchema),
    handleOrderInvoicePdfRequest
);
router.get(
    '/:orderId/financials/remaining',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderRemainingAmountSchema),
    handleOrderRemainingAmountRequest
);

router.patch(
    '/:orderId',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderDetailsUpdateSchema),
    handleOrderDetailsUpdateRequest
);
router.patch(
    '/:orderId/items',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderItemsUpdateSchema),
    handleOrderItemsUpdateRequest
);
router.patch(
    '/:orderId/status',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderStatusUpdateSchema),
    handleOrderStatusUpdateRequest
);
router.patch(
    '/:orderId/internal-note',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderInternalNoteUpdateSchema),
    handleOrderInternalNoteUpdateRequest
);
router.patch(
    '/:orderId/financials/events/:eventId/void',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderFinancialsEventVoidSchema),
    handleOrderFinancialsEventVoidRequest
);
router.patch(
    '/:orderId/financials/payments/offline',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderOfflinePaymentApplySchema),
    handleOrderOfflinePaymentApplyRequest
);
router.patch(
    '/:orderId/financials/refunds/offline',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderOfflineRefundApplySchema),
    handleOrderOfflineRefundApplyRequest
);

router.post(
    '/webhook',
    handleOrderFinancialsWebhook
);
router.post(
    '/:orderId/repeat',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderRepeatSchema),
    handleOrderRepeatRequest
);
router.post(
    '/:orderId/financials/payments/online',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(orderOnlinePaymentCreateSchema),
    handleOrderOnlinePaymentCreateRequest
);
router.post(
    '/:orderId/financials/refunds/online/full',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    validateInput(orderOnlineRefundsCreateSchema),
    handleOrderOnlineRefundsCreateRequest
);

export default router;
