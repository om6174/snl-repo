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

    async getAll(filters: Record<string, any> = {}): Promise<Record<string, any>[]> {
        let query = knex(this.tableName)
        .select(`${this.tableName}.*`, 'variation.*')
        .leftJoin('variation', `${this.tableName}.variationId`, 'variation.id');

        if (Object.keys(filters).length > 0) {
            for (const key in filters) {
                if (filters.hasOwnProperty(key)) {
                    const value = filters[key];
                    
                    // If the filter value is a string, use 'like' for substring matching
                    if (typeof value === 'string') {
                        query = query.where(key, 'like', `%${value}%`);
                    } else {
                        // For other data types, use a standard equality check
                        query = query.where(key, value);
                    }
                }
            }
        }

        return query;
    }

    async delete(id: number): Promise<boolean> {
        await knex(this.tableName).where({ id }).update({status: GameplayStatus.ARCHIVED});
        return true;
    }
}

