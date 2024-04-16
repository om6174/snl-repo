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

    loginUser = async ({body, locals}: ServiceType ) => {
        let record = await this.model.getByPhone(body.phoneNumber);
        
        // Create a new user if not found
        if (!record) {
            record = await this.model.create({
                name: body.name,
                phoneNumber: body.phoneNumber,
                status: 1,
                numberOfDevices: 1
            });

        }else{
            record = await this.model.update(record.id as number, {numberOfDevices: record.numberOfDevices + 1})
        }

        // Update user as logged in

        // Generate JWT token
        const token = jwt.sign({id: record.id, role: UserRole.USER }, process.env.JWT_SECRET as string);

        return { token, record };
    };

    logoutUser = async ({body, params, query, locals}: ServiceType) => {
        const userId = locals.user.id;
        const record = await this.model.getById(userId);

        if (!record) throw new Error("No user with given contact number.");

        // Update user as logged out

        return { message: "Successfully logged out." };
    };
    
}
