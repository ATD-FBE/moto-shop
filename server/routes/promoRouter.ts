import { Router } from 'express';
import config from '@server/config/config.js';
import { PROMO_STORAGE_PATH } from '@server/config/paths.js';
import createMulterConfig from '@server/utils/multerConfig.js';
import {
    verifyAuth, verifyUser, verifyRole,
    optionalAuth, optionalUser, optionalRole
} from '@server/middlewares/authMiddleware.js';
import {
    handlePromoListRequest,
    handlePromoRequest,
    handlePromoCreateRequest,
    handlePromoUpdateRequest,
    handlePromoDeleteRequest
} from '@server/controllers/promoController.js';
import { MULTER_MODE } from '@server/config/constants.js';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_PROMO_IMAGE_SIZE_MB,
    USER_ROLE
} from '@shared/constants.js';

const uploadImage = createMulterConfig({
    type: 'single',
    fields: 'image',
    storageMode: config.storage.multerMode,
    storagePath: config.storage.multerMode === MULTER_MODE.DISK ? PROMO_STORAGE_PATH : null,
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    maxSizeMB: MAX_PROMO_IMAGE_SIZE_MB
});

const router: Router = Router();
const { ADMIN, CUSTOMER } = USER_ROLE;

router.get('/', optionalAuth, optionalUser, optionalRole(ADMIN, CUSTOMER), handlePromoListRequest);
router.get('/:promoId', verifyAuth, verifyUser, verifyRole(ADMIN), handlePromoRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), uploadImage, handlePromoCreateRequest);
router.put('/:promoId', verifyAuth, verifyUser, verifyRole(ADMIN), uploadImage, handlePromoUpdateRequest);
router.delete('/:promoId', verifyAuth, verifyUser, verifyRole(ADMIN), handlePromoDeleteRequest);

export default router;
