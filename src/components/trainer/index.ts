import {TrainerService} from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';


const service = new TrainerService();
const routeManager = new RouteManager(service);

routeManager.setEndpoint = new RouteConfig('/login', service.login, [], [], 'post');
routeManager.setEndpoint = new RouteConfig('/logout', service.logout, [], [], 'post');
routeManager.setEndpoint = new RouteConfig('/', service.getAll, [], [], 'get')

export default routeManager.router;
