export type TServerPayload<T> = T extends any ? Omit<T, 'status'> : never;
