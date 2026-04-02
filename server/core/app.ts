import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { requestContext } from '@server/middlewares/requestContextMiddleware.js';
import { errorTracker, globalErrorHandler } from '@server/middlewares/errorMiddleware.js';
import { disableCache } from '@server/middlewares/authMiddleware.js';
import {
    serveBuildFiles,
    servePublicFiles,
    serveStorageFiles,
    serveReactApp
} from '@server/middlewares/fileMiddleware.js';
import { requestTimeout as reqTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { sseCorsMiddleware } from '@server/middlewares/sseMiddleware.js';
import logRouter from '@server/routes/logRouter.js';
import companyRouter from '@server/routes/companyRouter.js';
import authRouter from '@server/routes/authRouter.js';
import newsRouter from '@server/routes/newsRouter.js';
import promoRouter from '@server/routes/promoRouter.js';
import customerRouter from '@server/routes/customerRouter.js';
import notificationRouter from '@server/routes/notificationRouter.js';
import categoryRouter from '@server/routes/categoryRouter.js';
import productRouter from '@server/routes/productRouter.js';
import cartRouter from '@server/routes/cartRouter.js';
import checkoutRouter from '@server/routes/checkoutRouter.js';
import orderRouter from '@server/routes/orderRouter.js';
import sseRouter from '@server/routes/sseRouter.js';
import { STORAGE_URL_PATH } from '@server/config/paths.js';

const app = express();
const apiRouter = express.Router();

app.use('/build', serveBuildFiles(express)); // Работает в продакшне
app.use(servePublicFiles(express)); // Работает в продакшне
app.get(`${STORAGE_URL_PATH}/*`, serveStorageFiles);

app.set('trust proxy', true); // Для определения IP адреса в requestContext

app.use(requestContext);
app.use(errorTracker);
app.use(cookieParser());
app.use(express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
        req.rawBody = buf;
    }
}));

apiRouter.use('/logs', reqTimeout(15000), logRouter);
apiRouter.use('/company', reqTimeout(15000), companyRouter);
apiRouter.use('/auth', reqTimeout(15000), disableCache, authRouter);
apiRouter.use('/news', reqTimeout(15000), newsRouter);
apiRouter.use('/promos', reqTimeout(20000), promoRouter);
apiRouter.use('/customers', reqTimeout(25000), customerRouter);
apiRouter.use('/notifications', reqTimeout(25000), notificationRouter);
apiRouter.use('/catalog/categories', reqTimeout(15000), categoryRouter);
apiRouter.use('/catalog/products', reqTimeout(30000), productRouter);
apiRouter.use('/cart', reqTimeout(10000), cartRouter);
apiRouter.use('/checkout/draft-orders', reqTimeout(30000), checkoutRouter);
apiRouter.use('/orders', reqTimeout(30000), orderRouter);
app.use('/api', apiRouter);

app.use('/sse', sseCorsMiddleware, sseRouter);
app.get('*', serveReactApp); // Работает в продакшне
app.use(globalErrorHandler);

export default app;
