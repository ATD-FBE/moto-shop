import { Router } from 'express';
import { verifyAuth, verifyUser, verifyRole } from '@server/middlewares/authMiddleware.js';
import { handleErrorLogsRequest } from '@server/controllers/logController.js';
import { USER_ROLE } from '@shared/constants.js';

const router: Router = Router();
const { ADMIN } = USER_ROLE;

router.get(
    '/errors',
    verifyAuth,
    verifyUser,
    verifyRole(ADMIN),
    handleErrorLogsRequest
);

export default router; 
