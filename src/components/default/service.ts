import { DefaultModel } from './model';

export class DefaultService<M extends DefaultModel> {
    protected model: M;

    constructor(model: M) {
        this.model = model;
    }

    getAll = async (): Promise<Record<string, any>[]> => {
        return this.model.getAll();
    };
    
    getById = async ({params}: {params: any}): Promise<Record<string, any> | null> => {
        return this.model.getById(params.id);
    };
    
    create = async ({body}: {body: any}): Promise<Record<string, any>> => {
        return this.model.create(body);
    };
    
    update = async ({body, params}: {body: Record<string, any>, params: any}): Promise<Record<string, any> | null> => {
        return this.model.update(params.id, body);
    };
    
    delete = async ({params}: {params: any}): Promise<number> => {
        return this.model.delete(params.id);
    };
    
}
