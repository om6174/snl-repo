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
        .select(`${this.tableName}.*`, 'variation.variationName', 'variation.gameType', 'variation.additionalDetails', 'trainer.name')
        .leftJoin('variation', `${this.tableName}.variationId`, 'variation.id')
        .leftJoin('trainer', `${this.tableName}.trainerId`, 'trainer.id');

        if (Object.keys(filters).length > 0) {
            for (const key in filters) {
                if (filters.hasOwnProperty(key)) {
                    const value = filters[key];
                    if (Array.isArray(value)) {
                        // Use whereIn for filtering with array values
                        query = query.whereIn(`${this.tableName}.${key}`, value);
                    }
                    // If the filter value is a string, use 'like' for substring matching
                    else if (typeof value === 'string') {
                        query = query.where(`${this.tableName}.${key}`, 'like', `%${value}%`);
                    } else {
                        // For other data types, use a standard equality check
                        query = query.where(`${this.tableName}.${key}`, value);
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

