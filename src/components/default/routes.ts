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


export class RouteManager<T, M extends DefaultModel<T>> {
    public routes: Record<string, RouteConfig>
    constructor(service: DefaultService<T, M>) {
        this.routes = {
            getAll: new RouteConfig('/', service.getAll, [], [UserRole.ADMIN], 'get'),
            getById: new RouteConfig('/:id', service.getById, [], [UserRole.ADMIN], 'get'),
            create: new RouteConfig('/', service.create, [], [UserRole.ADMIN], 'post'),
            update: new RouteConfig('/:id', service.update, [], [UserRole.ADMIN], 'put'),
            delete: new RouteConfig('/:id', service.delete, [], [UserRole.ADMIN], 'delete')
        };
    }

    // Function to add additional RouteConfig instances
    addRouteConfig(routeName: string, routeConfig: RouteConfig) {
        this.routes[routeName] = routeConfig;
    }

    // Function to convert the key-value pairs into routes
    createRoutes() {
        const router = express.Router();

        // Iterate through each key-value pair in the routes object
        for (const routeName in this.routes) {
            if (this.routes.hasOwnProperty(routeName)) {
                const routeConfig = this.routes[routeName];

                // Destructure the data from RouteConfig instance
                const { path, method, serviceFunction, validator, roles } = routeConfig;

                // Create a middleware array: validators followed by authentication middleware
                const middlewares = [...validator, authenticateMiddleware(roles)];

                // Add the route to the Express Router using the method specified
                router[method](path, ...middlewares, handleService(serviceFunction));
            }
        }

        return router;
    }
}

// export type Api = {
//     validator: ValidationChain[],
//     serviceFunction?: ({ body, params, query }: {
//         body: any;
//         params: any;
//         query: any;
//     }) => any,
//     roles: UserRole[],
//     method: string,
//     path: string
// }

// export function createCRUD<T, M extends DefaultModel<T>>(service: DefaultService<T, M>)
// {
//     const routes: Record<string, Api> = {
//         getAll: {
//             serviceFunction: service.getAll,
//             validator: [],
//             roles: [UserRole.ADMIN],
//             method: "GET",
//             path: "/"
//         },
//         getById: {
//             serviceFunction: service.getById,
//             validator: [],
//             roles: [UserRole.ADMIN],
//             method: "GET",
//             path: "/:id"
//         },
//         delete: {
//             serviceFunction: service.delete,
//             validator: [],
//             roles: [UserRole.ADMIN],
//             method: "DELETE",
//             path: "/:id"
//         },
//         update: {
//             serviceFunction: service.update,
//             validator: [],
//             roles: [UserRole.ADMIN, UserRole.TRAINER],
//             method: "put",
//             path: "/:id"
//         },
//         create: {
//             serviceFunction: service.create,
//             validator: [],
//             roles: [UserRole.TRAINER],
//             method: "POST",
//             path: "/"
//         },
//     };
//     return routes;
// }

// function createCrudRoutes(routes: Record<string, Api>): express.Router
// {
//     const router = express.Router();

//     // Iterate over each key in the routes object
//     for (const [routeName, apiConfig] of Object.entries(routes))
//     {
//         const { method, serviceFunction, validator, roles, path } = apiConfig;
//         if (serviceFunction)
//         {
//             // Get the method, service function, validator, and roles from the API configuration

//             // Determine the HTTP method for the route (e.g., "GET", "POST", "PUT", "DELETE")
//             const httpMethod = method.toLowerCase() as 'get' | 'put' | 'post' | 'delete' | 'patch'; // Convert method to lowercase

//             // Use the appropriate HTTP method function (e.g., router.get, router.post) to create the route
//             router[httpMethod](path, authenticateMiddleware(roles), validator, handleService(serviceFunction));
//         }


//     }

//     return router;
// }

//export default createCrudRoutes;