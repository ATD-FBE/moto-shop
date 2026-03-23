import { PROD_ENV, PROTOCOL, HOST, SERVER_PORT } from '@/config/constants.js';

export const getSseUrl = (path) =>
    PROD_ENV
        ? `/sse/${path}`
        : `${PROTOCOL}://${HOST}:${SERVER_PORT}/sse/${path}`;
