import { TrainerStatus } from '../../enums';
import { DefaultService } from '../default/service';
import { TrainerModel } from './model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class TrainerService extends DefaultService<TrainerModel> {
    constructor() {
        // Pass an instance of TrainerModel to the DefaultService constructor
        super(new TrainerModel());
    }


    create = async ({body}: {body: any}) => {
        body.password = bcrypt.hashSync(body.password, 10)
        return this.model.create(body);
    }

    login = async ({body, params, query}: {body: any, params: any, query: any}) => {

        const record = await this.model.getByPhone(body.phoneNumber);
        if (!record) throw new Error("No trainer with given contact number.");
    
        const passwordMatch = await bcrypt.compare(body.password, record.password);
        if (!passwordMatch) throw new Error("Incorrect password.");
        if (record.status === TrainerStatus.DISABLED)  throw new Error("Contact admin");
    
        const token = jwt.sign({ phoneNumber: record.phoneNumber, id: record.id, role: record.type }, process.env.JWT_SECRET as string);
    
        await this.model.update(record.id, { isLoggedIn: true });

        return token;
    };
    
    logout = async ({body, params, query, locals}: {body: any, params: any, query: any, locals: any}, ) => {
    
        const record = await this.model.getById(locals.user.id);
        if (!record) throw new Error("No trainer with given contact number.");
        
        await this.model.update(record.id, { isLoggedIn: false });

        return record;
    };
    
}
