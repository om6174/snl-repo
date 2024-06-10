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
            const data = await this.model.getAll(query);
            games = data;

        }
        else{
            const data = await this.model.getAll({...query, trainerId: locals.user});
            games = data;

        }
        console.log(games)

        games = games.map(game => { 
            game.additionalDetails = JSON.parse(game.additionalDetails||"{}"); return game;});
        return games;

    };

    getById = async ({ params }: ServiceType): Promise<Record<string, any> | null> => {
        const gameplay = await this.model.getById(params.id);
        const players = [];
        if(gameplay){
            let users = await knex('user').where({gameId: gameplay.url}).orderBy('score', 'desc', 'last').orderBy('numberOfMoves', 'asc', 'last');
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
    
        // Return the created gameplay record
        return gameplay;
      };

    getByUrl = async ({ params }: ServiceType): Promise<Record<string, any>> => {
        const game = await this.model.getByUrl(params.url);
        game.additionalDetails = JSON.parse(game.additionalDetails);
        return game;
    }
}
