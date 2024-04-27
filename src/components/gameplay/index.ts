import { GameplayService } from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';
import { validateCreateGameplay, validateUpdateGameplay } from '../../validators';


const service = new GameplayService();
const routeManager = new RouteManager(service, {create: validateCreateGameplay, update: validateUpdateGameplay}, {create: [UserRole.TRAINER], getAll: [], getById: [UserRole.TRAINER, UserRole.ADMIN], delete: [UserRole.TRAINER]});

export default routeManager.router;
