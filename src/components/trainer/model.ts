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

export enum TrainerStatus {
    LOGGED_IN = 1,
    LOGGED_OUT = 2,
    DISABLED = 3
}

export class TrainerModel extends DefaultModel<Trainer> {
    constructor() {
        super('trainer');
    }

    getByPhone = async (phoneNumber: string) => this.getOne({ phoneNumber })
}

