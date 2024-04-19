import knex from '../../config/knex';
import { VariationStatus } from '../../enums';
import { DefaultModel } from '../default/model';

export type Variation = {
    id: number; 
    timePerMove: number | null;
    gameType: string;
    customId: number | null;
    additionalDetails: any;
    banner: string | null;
    variationName: string;
    status: VariationStatus;
    createdAt: Date;
    updatedAt: Date;
};

export class VariationModel extends DefaultModel {
    constructor() {
        super('variation');
    }
    async update(id: number, data: Record<string, any>): Promise<Record<string, any>> {
        data.additionalDetails = JSON.stringify(data.additionalDetails);
        const [newRecord] = await knex(this.tableName).where({id}).update(data).returning('*');
        newRecord.additionalDetails = JSON.parse(newRecord.additionalDetails);
        return newRecord;
    }

    async create(data: Record<string, any>): Promise<Record<string, any>> {
        data.additionalDetails = JSON.stringify(data.additionalDetails);
        const [newRecord] = await knex(this.tableName).insert(data).returning('*');
        newRecord.additionalDetails = JSON.parse(newRecord.additionalDetails);
        return newRecord;
    }
    async delete(id: number): Promise<boolean> {
        //await knex(this.tableName).where({ id }).update({status: 2});
        await knex(this.tableName).where({ id }).delete();

        return true;
    }
}

