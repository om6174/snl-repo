
export type ServiceType = {
    body: Record<string, any>;
    params: Record<string, any>;
    query: Record<string, any>;
    locals: Record<string, any>;
    files?: Record<string, Express.Multer.File[]> | Express.Multer.File[];
}