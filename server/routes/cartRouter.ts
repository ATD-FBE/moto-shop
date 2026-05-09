import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    guestCartItemListSchema,
    cartItemUpdateSchema,
    cartItemRestoreSchema,
    cartItemRemoveSchema
} from '@server/validation/schemas/cart.schemas.js';
import {
    handleCartItemListRequest,
    handleGuestCartItemListRequest,
    handleCartItemRestoreRequest,
    handleCartItemUpdateRequest,
    handleCartWarningsFixRequest,
    handleCartItemRemoveRequest,
    handleCartClearRequest
} from '@server/controllers/cartController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { CUSTOMER } = USER_ROLE;

router.get(
    '/',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleCartItemListRequest
);
router.post(
    '/guest',
    validateInput(guestCartItemListSchema),
    handleGuestCartItemListRequest
);
router.post(
    '/items/restore/:productId',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(cartItemRestoreSchema),
    handleCartItemRestoreRequest
);
router.put(
    '/items/:productId',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(cartItemUpdateSchema),
    handleCartItemUpdateRequest
);
router.patch(
    '/warnings',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleCartWarningsFixRequest
);
router.delete(
    '/items/:productId',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(cartItemRemoveSchema),
    handleCartItemRemoveRequest
);
router.delete(
    '/clear',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleCartClearRequest
);

export default router;
