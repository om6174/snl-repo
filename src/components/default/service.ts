import { DefaultModel } from './model';

export class DefaultService<T, M extends DefaultModel<T>> {
    protected model: M;

    constructor(model: M) {
        this.model = model;
    }

    getAll = async (): Promise<T[]> => {
        return this.model.getAll();
    };
    
    getById = async ({params}: {params: any}): Promise<T | null> => {
        return this.model.getById(params.id);
    };
    
    create = async ({body}: {body: any}): Promise<T> => {
        return this.model.create(body);
    };
    
    update = async ({body, params}: {body: Partial<T>, params: any}): Promise<T | null> => {
        return this.model.update(params.id, body);
    };
    
    delete = async ({params}: {params: any}): Promise<number> => {
        return this.model.delete(params.id);
    };
    
}
