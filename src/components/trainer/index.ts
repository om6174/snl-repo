import {TrainerService} from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';
import { validateCreateTrainer, validateLoginTrainer, validateUpdateTrainer } from '../../validators';


const service = new TrainerService();
const routeManager = new RouteManager(service, {create: validateCreateTrainer, update: validateUpdateTrainer});

routeManager.setEndpoint = new RouteConfig('/login', service.login, validateLoginTrainer, [], 'post');
routeManager.setEndpoint = new RouteConfig('/logout', service.logout, [], [], 'post');
routeManager.setEndpoint = new RouteConfig('/', service.getAll, [], [UserRole.ADMIN, UserRole.TRAINER], 'get')

export default routeManager.router;
