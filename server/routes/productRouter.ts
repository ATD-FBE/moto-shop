import { Router } from 'express';
import config from '../config/config.js';
import { PRODUCT_STORAGE_PATH } from '../config/paths.js';
import createMulterConfig from '../utils/multerConfig.js';
import {
    verifyAuth, verifyUser, verifyRole,
    optionalAuth, optionalUser, optionalRole
} from '../middlewares/authMiddleware.js';
import {
    handleProductListRequest,
    handleProductRequest,
    handleProductCreateRequest,
    handleProductUpdateRequest,
    handleBulkProductUpdateRequest,
    handleProductDeleteRequest,
    handleBulkProductDeleteRequest
} from '../controllers/productController.js';
import {
    ALLOWED_IMAGE_MIME_TYPES,
    PRODUCT_FILES_LIMIT,
    MAX_PRODUCT_IMAGE_SIZE_MB,
    USER_ROLE,
    SERVER_CONSTANTS
} from '../../shared/constants.js';

const { ADMIN, CUSTOMER } = USER_ROLE;
const { MULTER_MODE } = SERVER_CONSTANTS;

const uploadImages = createMulterConfig({
    type: 'array',
    fields: 'images',
    storageMode: config.storage.multerMode,
    storagePath: config.storage.multerMode === MULTER_MODE.DISK ? PRODUCT_STORAGE_PATH : null,
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    filesLimit: PRODUCT_FILES_LIMIT,
    maxSizeMB: MAX_PRODUCT_IMAGE_SIZE_MB
});

const router: Router = Router();

router.get('/', optionalAuth, optionalUser, optionalRole(ADMIN, CUSTOMER), handleProductListRequest);
router.get('/:productId', optionalAuth, optionalUser, optionalRole(ADMIN, CUSTOMER), handleProductRequest);
router.post('/', verifyAuth, verifyUser, verifyRole(ADMIN), uploadImages, handleProductCreateRequest);
router.put('/:productId', verifyAuth, verifyUser, verifyRole(ADMIN), uploadImages, handleProductUpdateRequest);
router.patch('/bulk', verifyAuth, verifyUser, verifyRole(ADMIN), handleBulkProductUpdateRequest);
router.delete('/bulk', verifyAuth, verifyUser, verifyRole(ADMIN), handleBulkProductDeleteRequest);
router.delete('/:productId', verifyAuth, verifyUser, verifyRole(ADMIN), handleProductDeleteRequest);

export default router;
