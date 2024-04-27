import { GameplayStatus, UserRole } from '../../enums';
import { ServiceType } from '../../types';
import { DefaultService } from '../default/service';
import { GameplayModel } from './model';
import { v4 as uuidv4 } from 'uuid';

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
    create = async ({ body, params, locals }: ServiceType): Promise<Record<string, any>> => {
        // Assign trainerId from locals
        body.trainerId = locals.user;
        // Generate a unique URL for the gameplay
        body.url = uuidv4();
        // Set the gameplay status to LIVE
        body.status = GameplayStatus.LIVE;
        
        // Create a new gameplay in the model
        const gameplay = await this.model.create(body);
        
        // Create a new socket.io room for the gameplay using the URL as the room identifier
        const gameRoom = params.url;
    
        // Return the created gameplay record
        return gameplay;
      };
}
