import { GameplayStatus, UserRole } from '../../enums';
import { ServiceType } from '../../types';
import { DefaultService } from '../default/service';
import { GameplayModel } from './model';
import { v4 } from 'uuid';

export class GameplayService extends DefaultService<GameplayModel> {
    constructor() {
        // Pass an instance of TrainerModel to the DefaultService constructor
        super(new GameplayModel());
    }

    getAll = async ({locals, query}: ServiceType): Promise<Record<string, any>[]> => {
        if(locals.role === UserRole.ADMIN)
            return this.model.getAll(query);
        else
            return this.model.getAll({...query, trainerId: locals.user});
    };

    create = async ({ body, locals }: ServiceType): Promise<Record<string, any>> => {
        body.trainerId = locals.user;
        body.url = v4();
        body.status = GameplayStatus.LIVE;
        return this.model.create(body)
    };
}
