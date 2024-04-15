import express from 'express';
import { authenticate, authenticateMiddleware, handleService } from '../../middleware';
import { UserRole } from '../../enums';
import { ValidationChain } from 'express-validator';
import { DefaultService } from './service';
import { DefaultModel } from './model';

type serviceType = (({ body, params, query }: { body: Record<string, any>; params: Record<string, any>; query: Record<string, any>; }, locals: Record<string, any>) => any);
export class RouteConfig
{
    constructor(
        public path: string,
        public serviceFunction: serviceType,
        public validator: ValidationChain[] = [],
        public roles: UserRole[] = [UserRole.ADMIN],
        public method: 'get' | 'post' | 'put' | 'delete' = 'get',
    ) { }
}

export class RouteManager<M extends DefaultModel> {
    #endpoint: Record<string, RouteConfig>;
    #router: express.Router = express.Router();

    constructor(service: DefaultService<M>) {
        this.#endpoint = {
            getAll: new RouteConfig('/', service.getAll, [], [UserRole.ADMIN], 'get'),
            getById: new RouteConfig('/:id', service.getById, [], [UserRole.ADMIN], 'get'),
            create: new RouteConfig('/', service.create, [], [UserRole.ADMIN], 'post'),
            update: new RouteConfig('/:id', service.update, [], [UserRole.ADMIN], 'put'),
            delete: new RouteConfig('/:id', service.delete, [], [UserRole.ADMIN], 'delete')
        };
    }

    set setEndpoint(endpoint: RouteConfig){
        this.#endpoint[endpoint.serviceFunction.name] = endpoint;
    }

    set deleteEndpoint(key: serviceType){
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