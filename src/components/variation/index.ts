import {VariationService} from './service';
import { RouteManager, RouteConfig } from '../default/routes';
import { UserRole } from '../../enums';
import { validateCreateVariation, validateUpdateVariation } from '../../validators';
import { upload, handleService } from '../../middleware';


const service = new VariationService();
const routeManager = new RouteManager(service, {create: validateCreateVariation, update: validateUpdateVariation});
routeManager.setEndpoint = new RouteConfig('/', service.getAll, [], [UserRole.ADMIN, UserRole.TRAINER], 'get');
routeManager.setEndpoint = new RouteConfig('/:id', service.getById, [], [UserRole.ADMIN, UserRole.TRAINER], 'get');
routeManager.setEndpoint = new RouteConfig('/url/:url', service.getByUrl, [], [], 'get')

const router = routeManager.router;
router.post('/', upload.fields([{ name: 'siteBanner' }, { name: 'mobileBanner' }]), handleService(service.create));

export default router;
