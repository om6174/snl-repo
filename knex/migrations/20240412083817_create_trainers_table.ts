import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void>
{
    await knex.schema.createTableIfNotExists('trainer', function (table)
    {
        table.increments('id').primary();
        table.string('name');
        table.string('phoneNumber').unique();
        table.string('password');
        table.integer('createdBy');
        table.string('uniqueId');
        table.integer('type');
        table.boolean('isLoggedIn');
        table.integer('status');
        table.timestamps(true, true);
    });

    const adminUser = await knex('trainer')
    .where({ name: 'Pidilite Superadmin' })
    .first();

// If admin user does not exist, insert a new admin user
    if (!adminUser) {
        await knex('trainer').insert({
            name: 'Pidilite Superadmin',
            phoneNumber: '9309125102',
            status: 1,
            uniqueId: "SUPERADMIN",
            type: 1,
            createdBy: null,
            password: "$2b$10$LGH83PCA4A02TVP.mBrRW.faMBkkL3fvyPFey20vilv3OZ2vmCI02"
        });
        console.log('Admin user created');
    } else {
        console.log('Admin user already exists');
    }

    const trainerUser = await knex('trainer')
    .where({ name: 'Pidilite trainer' })
    .first();

// If admin user does not exist, insert a new admin user
    if (!trainerUser) {
        await knex('trainer').insert({
            name: 'Pidilite trainer',
            phoneNumber: '7259035102',
            status: 1,
            uniqueId: "TRAINER",
            type: 2,
            createdBy: null,
            password: "$2b$10$LGH83PCA4A02TVP.mBrRW.faMBkkL3fvyPFey20vilv3OZ2vmCI02"
        });
        console.log('Trainer user created');
    } else {
        console.log('Trainer user already exists');
    }
    
    await knex.schema.createTableIfNotExists('variation', function (table) {
        table.increments('id').primary(); // Primary key
        table.string('gameType'); // Game type (as string)
        table.integer('customId'); // Custom ID (as integer)
        table.jsonb('additionalDetails'); // Additional details (as JSONB)
        table.string('siteBanner'); // Banner (as string)
        table.string('mobileBanner'); // Banner (as string)
        table.string('variationName'); // Variation name (as string)
        table.string('status'); // Status (as string)
        table.timestamps(true, true); // Timestamps for created and updated

    });

    await knex.schema.createTableIfNotExists('gameplay', function (table) {
        table.increments('id').primary(); // Primary key
        table.integer('variationId').unsigned().notNullable().references('variation.id').onDelete('CASCADE'); // Variation ID (as integer)
        table.integer('trainerId').unsigned(); // Trainer ID (as integer)
        table.timestamp('startedAt'); // Game start time (as timestamp)
        table.timestamp('endedAt'); // Game end time (as timestamp)
        table.string('url').unique(); // URL (as string)
        table.integer('status').defaultTo(1); // Status (as string, e.g., 'live', 'archived')
        table.integer('numberOfPlayers'); // Number of players (as integer)

        table.foreign('trainerId').references('id').inTable('trainer').onDelete('CASCADE');


    });

    
    await knex.schema.createTableIfNotExists('user', function (table)
    {
        table.increments('id').primary();
        table.string('name');
        table.string('gameId');
        table.string('phoneNumber');
        table.datetime('finishedTime');
        table.integer('status');
        table.integer('score');
        table.integer('numberOfDevices');
        table.timestamps(true, true);

        table.foreign('gameId').references('url').inTable('gameplay').onDelete('CASCADE');
    });

    await knex.schema.createTableIfNotExists('snakesLadders', function (table) {
        table.increments('id').primary(); // Primary key
        table.jsonb('snakePositions'); // Array of integers for snake positions
        table.jsonb('ladderPositions'); // Array of integers for ladder positions
    });
}


export async function down(knex: Knex): Promise<void>
{
    await knex.schema.dropTableIfExists('trainer');
    await knex.schema.dropTableIfExists('user');
    await knex.schema.dropTableIfExists('gameplay');
    await knex.schema.dropTableIfExists('variation');

    await knex.schema.dropTableIfExists('snakesLadders');

}

