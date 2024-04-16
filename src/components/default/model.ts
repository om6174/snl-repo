import { Knex } from 'knex';
import knex from '../../config/knex';

export class DefaultModel{

    constructor(protected tableName: string) {}

    async getAll(filters: Record<string, any> = {}): Promise<Record<string, any>[]> {
        let query = knex(this.tableName).select('*');

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

    async getById(id: number): Promise<Record<string, any> | null> {
        return await knex(this.tableName).where({ id }).select('*').first();
    }

    async create(data: Record<string, any>): Promise<Record<string, any>> {
        try{
            const [newRecord] = await knex(this.tableName).insert(data).returning('*');
            return newRecord;
        }catch(err: any){
            if(err.errno===19)
                throw new Error("Trainer/ Admin with given phone number already exists.")
            else
                throw err;
        }
    }

    async update(id: number, data: Record<string, any>): Promise<Record<string, any>> {
        const [updatedRecord] = await knex(this.tableName).where({ id }).update(data).returning('*');
        return updatedRecord;
    }

    async delete(id: number): Promise<boolean> {
        await knex(this.tableName).where({ id }).del().catch(err=>{console.log(err); return false;});
        return true;
    }

    async getOne(filter: Record<string, any>): Promise<Record<string, any>>{
        const record = await knex(this.tableName).where(filter).first();
        return record || null;
    }
}

