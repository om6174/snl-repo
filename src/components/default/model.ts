import knex from '../../config/knex';

export class DefaultModel{

    constructor(protected tableName: string) {}

    async getAll(): Promise<Record<string, any>[]> {
        return await knex(this.tableName).select('*');
    }

    async getById(id: number): Promise<Record<string, any> | null> {
        return await knex(this.tableName).where({ id }).first();
    }

    async create(data: Record<string, any>): Promise<Record<string, any>> {
        const [newRecord] = await knex(this.tableName).insert(data).returning('*');
        return newRecord;
    }

    async update(id: number, data: Record<string, any>): Promise<Record<string, any>> {
        const [updatedRecord] = await knex(this.tableName).where({ id }).update(data).returning('*');
        return updatedRecord;
    }

    async delete(id: number): Promise<number> {
        return await knex(this.tableName).where({ id }).del();
    }

    async getOne(filter: Record<string, any>): Promise<Record<string, any>>{
        const record = await knex(this.tableName).where(filter).first();
        return record || null;
    }
}

