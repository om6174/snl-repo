import knex from '../../config/knex';
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
        let games: Record<string, any>[] = [];
        if(locals.role === UserRole.ADMIN){
            const [data] = await this.model.getAll(query);
            games.push(data);

        }
        else{
            const [data] = await this.model.getAll({...query, trainerId: locals.user});
            games.push(data);

        }
        games = games.map(game => { 
            game.additionalDetails = JSON.parse(game.additionalDetails); return game;});

        return games;

    };

    getById = async ({ params }: ServiceType): Promise<Record<string, any> | null> => {
        const gameplay = await this.model.getById(params.id);
        const players = [];
        if(gameplay && gameplay?.status !== GameplayStatus.LIVE){
            let users = await knex('user').where({gameId: gameplay.url}).orderBy('score', 'desc', 'last').orderBy('finishedTime', 'asc', 'last');
            users = users.map(user => {user.finishedTime = user.finishedTime - gameplay.startedAt; return user;});
            players.push(users);
        }
        return {gameplay, players}
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

    getByUrl = async ({ params }: ServiceType): Promise<Record<string, any>> => {
        return this.getByUrl(params.url)
    }
}
