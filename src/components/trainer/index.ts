import { handleService } from '../../middleware';
import {TrainerService} from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';


const service = new TrainerService();


const routeManager = new RouteManager(service);
routeManager.addRouteConfig('login', new RouteConfig('/login', service.loginTrainer, [], [], 'post'))
routeManager.addRouteConfig('logout', new RouteConfig('/logout', service.logoutTrainer, [], [], 'post'))

// let endpoints = createCRUD(service)
// endpoints['getAll'].roles = [UserRole.TRAINER, UserRole.ADMIN]
// const router = createCrudRoutes(endpoints);

// router.post('/login', handleService(service.loginTrainer));
// router.post('/logout', handleService(service.logoutTrainer));

export default routeManager.createRoutes();
