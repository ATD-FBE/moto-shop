import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { validateInput } from '@server/middlewares/validationMiddleware.js';
import {
    authRegistrationSchema,
    authLoginSchema,
    authUserUpdateSchema,
    authSessionSchema,
    authCheckoutPrefsUpdateSchema
} from '@server/validation/schemas/auth.schemas.js';
import {
    handleAuthCheckoutPrefsRequest,
    handleAuthRegistrationRequest,
    handleAuthLoginRequest,
    handleAuthSessionRequest,
    handleAuthRefreshRequest,
    handleAuthLogoutRequest,
    handleAuthUserUpdateRequest,
    handleAuthCheckoutPrefsUpdateRequest
} from '@server/controllers/authController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { CUSTOMER } = USER_ROLE;

router.get(
    '/checkout-prefs',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    handleAuthCheckoutPrefsRequest
);
router.post(
    '/register',
    validateInput(authRegistrationSchema),
    handleAuthRegistrationRequest
);
router.post(
    '/login',
    validateInput(authLoginSchema),
    handleAuthLoginRequest
);
router.post(
    '/session',
    verifyAuth,
    verifyUser,
    validateInput(authSessionSchema),
    handleAuthSessionRequest
);
router.post(
    '/refresh',
    handleAuthRefreshRequest
);
router.post(
    '/logout',
    handleAuthLogoutRequest
);
router.patch(
    '/user',
    verifyAuth,
    verifyUser,
    validateInput(authUserUpdateSchema),
    handleAuthUserUpdateRequest
);
router.patch(
    '/checkout-prefs',
    verifyAuth,
    verifyUser,
    verifyRole(CUSTOMER),
    validateInput(authCheckoutPrefsUpdateSchema),
    handleAuthCheckoutPrefsUpdateRequest
);

export default router;
