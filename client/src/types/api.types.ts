export interface IApiFetchConfig {
    authRequired?: boolean;
    skipRefreshTokenCheck?: boolean;
    timeout?: number;
    minDelay?: number;
    errorPrefix?: string;
}

export interface IApiResponseExtraConfig {
    errorPrefix?: string;
    asFile?: boolean;
    [key: string]: unknown;
}
