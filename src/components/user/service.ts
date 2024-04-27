import { DefaultService } from '../default/service';
import { User, UserModel } from './model';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../enums'
import { ServiceType } from '../../types';

export class TrainerService extends DefaultService<UserModel> {
    constructor() {
        // Pass an instance of TrainerModel to the DefaultService constructor
        super(new UserModel());
    }

    loginUser = async ({ body, params }: ServiceType) => {        
        let record = await this.model.getByPhone(body.phoneNumber, params.gameId);
        
        if (!record) {
            record = await this.model.create({
                name: body.name,
                phoneNumber: body.phoneNumber,
                status: 1,
                numberOfDevices: 1,
                gameId: params.gameId,
                isLoggedIn: true,
            });
        } else {
            record = await this.model.update(record.id, {
                numberOfDevices: record.numberOfDevices + 1,
            });
        }

        return record;
    };

    logoutUser = async ({body, params, query, locals}: ServiceType) => {
        const userId = locals.user.id;
        const record = await this.model.getById(userId);

        if (!record) throw new Error("No user with given contact number.");

        // Update user as logged out

        return { message: "Successfully logged out." };
    };
    
}
