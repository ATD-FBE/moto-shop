import type { TDbUser } from '@server/types/index.js';
import type { ICustomer } from '@shared/types/index.js';

export const prepareCustomer = (dbCustomer: TDbUser): ICustomer => ({
    id: dbCustomer._id.toString(),
    name: dbCustomer.name,
    email: dbCustomer.email,
    discount: dbCustomer.discount,
    totalSpent: dbCustomer.totalSpent,
    createdAt: dbCustomer.createdAt.toISOString(),
    isBanned: dbCustomer.isBanned
});
