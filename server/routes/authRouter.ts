import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
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

router.get('/checkout-preferences', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleAuthCheckoutPrefsRequest);
router.post('/register', handleAuthRegistrationRequest);
router.post('/login', handleAuthLoginRequest);
router.post('/session', verifyAuth, verifyUser, handleAuthSessionRequest);
router.post('/refresh', handleAuthRefreshRequest);
router.post('/logout', handleAuthLogoutRequest);
router.patch('/user', verifyAuth, verifyUser, handleAuthUserUpdateRequest);
router.patch('/checkout-preferences', verifyAuth, verifyUser, verifyRole(CUSTOMER), handleAuthCheckoutPrefsUpdateRequest);

export default router;
