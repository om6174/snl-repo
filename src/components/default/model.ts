import knex from '../../config/knex';

export class DefaultModel<T> {

    constructor(protected tableName: string) {}

    async getAll(): Promise<T[]> {
        return await knex(this.tableName).select('*');
    }

    async getById(id: number): Promise<T | null> {
        return await knex(this.tableName).where({ id }).first();
    }

    async create(data: T): Promise<T> {
        const [newRecord] = await knex(this.tableName).insert(data).returning('*');
        return newRecord;
    }

    async update(id: number, data: Partial<T>): Promise<T> {
        const [updatedRecord] = await knex(this.tableName).where({ id }).update(data).returning('*');
        return updatedRecord;
    }

    async delete(id: number): Promise<number> {
        return await knex(this.tableName).where({ id }).del();
    }

    async getOne(filter: Partial<T>): Promise<T>{
        const record = await knex(this.tableName).where(filter).first();
        return record || null;
    }
}

