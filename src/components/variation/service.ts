import { UserRole, VariationStatus } from '../../enums';
import { ServiceType } from '../../types';
import { DefaultService } from '../default/service';
import { VariationModel } from './model';

export class VariationService extends DefaultService<VariationModel> {
    constructor() {
        // Pass an instance of TrainerModel to the DefaultService constructor
        super(new VariationModel());
    }

    getAll = async ({locals, query}: ServiceType): Promise<Record<string, any>[]> => {
        let records;

        records = await this.model.getAll({...query, status: VariationStatus.LIVE});
        records.map(record=>{record.additionalDetails = JSON.parse(record.additionalDetails)});
        return records;
    };

    getArchived = async ({locals, query}: ServiceType): Promise<Record<string, any>[]> => {
        let records;

        records = await this.model.getAll({...query, status: VariationStatus.ARCHIVED});
        records.map(record=>{record.additionalDetails = JSON.parse(record.additionalDetails)});
        return records;
    };
}
