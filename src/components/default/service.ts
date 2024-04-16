import { ServiceType } from '../../types';
import { DefaultModel } from './model';

export class DefaultService<M extends DefaultModel> {
    protected model: M;

    constructor(model: M) {
        this.model = model;
    }

    getAll = async ({query}: ServiceType): Promise<Record<string, any>[]> => {
        return this.model.getAll(query);
    };
    
    getById = async ({params}: ServiceType): Promise<Record<string, any> | null> => {
        return this.model.getById(params.id);
    };
    
    create = async ({body}: ServiceType): Promise<Record<string, any>> => {
        return this.model.create(body);
    };
    
    update = async ({body, params}: ServiceType): Promise<Record<string, any> | null> => {
        return this.model.update(params.id, body);
    };
    
    delete = async ({params}: ServiceType): Promise<boolean> => {
        return this.model.delete(params.id);
    };
    
}
