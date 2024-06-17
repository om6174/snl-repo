import express from 'express';
import { authenticateMiddleware, handleService } from '../../middleware';
import { UserRole } from '../../enums';
import { ValidationChain } from 'express-validator';
import { DefaultService } from './service';
import { DefaultModel } from './model';
import { ServiceType } from '../../types';

export class RouteConfig
{
    constructor(
        public path: string,
        public serviceFunction: ({ body, params, query, locals }:ServiceType)=>any,
        public validator: ValidationChain[] = [],
        public roles: UserRole[] = [UserRole.ADMIN],
        public method: 'get' | 'post' | 'put' | 'delete' = 'get',
    ) { }
}

export class RouteManager<M extends DefaultModel> {
    #endpoint: Record<string, RouteConfig>;
    #router: express.Router = express.Router();

    constructor(service: DefaultService<M>, 
        public v: Partial<Record<'create'|'getById'|'getAll'|'update'|'delete', ValidationChain[]>> = {
            create: [], update: [], delete: [], getAll: [], getById: []
        },
        public r: Partial<Record<'create'|'getById'|'getAll'|'update'|'delete', UserRole[]>> = {
            create: [UserRole.ADMIN], update: [UserRole.ADMIN], delete: [UserRole.ADMIN], getAll: [UserRole.ADMIN], getById: [UserRole.ADMIN, UserRole.TRAINER]
        }
    ) {
        this.#endpoint = {
            getAll: new RouteConfig('/', service.getAll, v.getAll, r.getAll, 'get'),
            getById: new RouteConfig('/:id', service.getById, v.getById, r.getById, 'get'),
            create: new RouteConfig('/', service.create, v.create, r.create, 'post'),
            update: new RouteConfig('/:id', service.update, v.update, r.update, 'put'),
            delete: new RouteConfig('/:id', service.delete, v.delete, r.delete, 'delete')
        };
    }

    set setEndpoint(endpoint: RouteConfig){
        this.#endpoint[endpoint.serviceFunction.name] = endpoint;
    }

    set deleteEndpoint(key: Function){
        delete this.#endpoint[key.name];
    }

    get router() {
        for (const routeConfig of Object.values(this.#endpoint)) {
                const { path, method, serviceFunction, validator, roles } = routeConfig;
                const middlewares = [...validator, authenticateMiddleware(roles)];
                this.#router[method](path, ...middlewares, handleService(serviceFunction));
        }

        return this.#router;
    }
}