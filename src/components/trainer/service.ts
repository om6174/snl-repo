import { TrainerStatus, UserRole } from '../../enums';
import { ServiceType } from '../../types';
import { DefaultService } from '../default/service';
import { TrainerModel } from './model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class TrainerService extends DefaultService<TrainerModel> {
    constructor() {
        // Pass an instance of TrainerModel to the DefaultService constructor
        super(new TrainerModel());
    }

    getAll = async ({ query, locals }: ServiceType): Promise<Record<string, any>[]> => {
        if(locals.role === UserRole.TRAINER){
            return this.model.getAll({id: locals.user})
        }else{
            return this.model.getAll(query)
        }
    };
    create = async ({body, locals}: ServiceType) => {
        body.password = bcrypt.hashSync(body.password, 10);
        body.createdBy = locals.user;
        return this.model.create(body);
    }

    update = async ({params, body}: ServiceType) => {
        if(body.password)
        body.password = bcrypt.hashSync(body.password, 10)
        return this.model.update(params.id, body);
    }

    login = async ({body, params, query}: ServiceType) => {

        const record = await this.model.getByPhone(body.phoneNumber);
        if (!record) throw new Error("No trainer with given contact number.");
    
        const passwordMatch = await bcrypt.compare(body.password, record.password);
        if (!passwordMatch) throw new Error("Incorrect password.");
        if (record.status === TrainerStatus.DISABLED)  throw new Error("Contact admin");
    
        const token = jwt.sign({ phoneNumber: record.phoneNumber, id: record.id, role: record.type }, process.env.JWT_SECRET as string);
    
        await this.model.update(record.id, { isLoggedIn: true });

        return {token, type: record.type, id: record.id};
    };
    
    logout = async ({body, params, query, locals}: ServiceType ) => {
    
        const record = await this.model.getById(locals.user.id);
        if (!record) throw new Error("No trainer with given contact number.");
        
        await this.model.update(record.id, { isLoggedIn: false });

        return record;
    };
    
}
