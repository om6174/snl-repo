import { TrainerStatus } from '../../enums';
import { DefaultModel } from '../default/model';

export type Trainer = {
    id: number;
    name: string;
    phoneNumber: string;
    password: string;
    createdBy: number;
    type: number;
    status: TrainerStatus;
    isLoggedIn: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class TrainerModel extends DefaultModel {
    constructor() {
        super('trainer');
    }

    getByPhone = async (phoneNumber: string) => this.getOne({ phoneNumber })
}

