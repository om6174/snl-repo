import knex from '../../config/knex';
import { GameplayStatus } from '../../enums';
import { DefaultModel } from '../default/model';

export interface Gameplay {
    id: number;
    variationId: number;
    trainerId: number;
    startedAt: Date | null;
    endedAt: Date | null;
    url: string | null;
    status: string;
    numberOfPlayers: number;
}

export class GameplayModel extends DefaultModel {
    constructor() {
        super('gameplay');
    }

    async delete(id: number): Promise<boolean> {
        await knex(this.tableName).where({ id }).update({status: GameplayStatus.ARCHIVED});
        return true;
    }
}

