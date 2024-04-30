import { GameplayService } from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';
import { validateCreateGameplay, validateUpdateGameplay } from '../../validators';


const service = new GameplayService();
const routeManager = new RouteManager(service, {create: validateCreateGameplay, update: validateUpdateGameplay}, {create: [UserRole.TRAINER], getAll: [UserRole.TRAINER, UserRole.ADMIN], getById: [], delete: [UserRole.TRAINER]});
routeManager.setEndpoint = new RouteConfig('/url/:url', service.getByUrl, [], [], 'get')

export default routeManager.router;
