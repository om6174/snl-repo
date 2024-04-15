import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void>
{
    await knex.schema.createTable('trainer', function (table)
    {
        table.increments('id').primary();
        table.string('name');
        table.string('phoneNumber');
        table.string('password');
        table.integer('createdBy');
        table.string('uniqueId');
        table.integer('type');
        table.boolean('isLoggedIn');
        table.integer('status');
        table.timestamps(true, true);
    });

    await knex.schema.createTable('user', function (table)
    {
        table.increments('id').primary();
        table.string('name');
        table.string('phoneNumber');
        table.integer('status');
        table.integer('numberOfDevices');
        table.timestamps(true, true);
    });
}


export async function down(knex: Knex): Promise<void>
{
    await knex.schema.dropTable('trainer');
    await knex.schema.dropTable('user');

}

