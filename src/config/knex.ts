import Knex from 'knex';
import knexConfig from '../../knexfile';

// Set the environment based on NODE_ENV, defaulting to 'development'
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Create and export the Knex instance
const knex = Knex(config);

export default knex;
