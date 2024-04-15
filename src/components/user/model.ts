import { DefaultModel } from '../default/model';

export interface User {
    id?: number;
    name: string;
    phoneNumber: string;
    status: number;
    createdAt?: Date;
    updatedAt?: Date;
    numberOfDevices: number;
}

export class UserModel extends DefaultModel<User> {
    constructor() {
        super('user');
    }

    getByPhone = async (phoneNumber: string): Promise<User | null> => this.getOne({ phoneNumber });
}

