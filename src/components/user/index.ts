import {TrainerService} from './service';
import {RouteConfig, RouteManager} from '../default/routes';
import { UserRole } from '../../enums';

const service = new TrainerService();

const routeManager = new RouteManager(service);
routeManager.setEndpoint = new RouteConfig('/login', service.loginUser, [], [], 'post');
routeManager.setEndpoint = new RouteConfig('/logout', service.logoutUser, [], [UserRole.USER], 'post');

export default routeManager.router;
