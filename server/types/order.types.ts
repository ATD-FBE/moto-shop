import { Types } from 'mongoose';

export interface IOrderItemRef {
    productId: string | Types.ObjectId;
    quantity: number;
}
