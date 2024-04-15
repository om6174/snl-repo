import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware function that passes query, params, and body to the service function
export const handleService = (serviceFunction: (params: {
    query: Record<string, any>; // Define the type for query if necessary
    params: Record<string, any>; // Define the type for params if necessary
    body: Record<string, any>; // Define the type for body if necessary
}, locals: Record<string, any>) => Promise<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Call the service function with query, params, and body from the request
            const result = await serviceFunction({query: req.query, params: req.params, body: req.body}, res.locals);

            // Send the result as the response
            res.json(result);
        } catch (err) {
            // Handle any errors that occur during the service function execution
            if (err instanceof Error) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(500).json({ error: 'An unknown error occurred' });
            }
        }
    };
};

export function authenticateMiddleware(allowedRoles: number[]){
    return function (req: Request, res: Response, next: NextFunction, ) {
        // Extract the token from the request headers
        const token = req.headers.authorization;
    
        // Check if token is provided
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }
    
        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any; // Verify the token using your JWT secret
    
            if(!allowedRoles.includes(decoded.role)){
                return res.status(401).json({ message: 'Unauthorized: Invalid role' });
            }
            // Attach the decoded payload to the request object
            res.locals.user = decoded.id;
    
            // Move to the next middleware
            next();
        } catch (error) {
            // Token is invalid
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }
    }
}
export function authenticate(req: Request, res: Response, next: NextFunction, ) {
    // Extract the token from the request headers
    const token = req.headers.authorization;

    // Check if token is provided
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any; // Verify the token using your JWT secret


        // Attach the decoded payload to the request object
        res.locals.user = decoded.id;

        // Move to the next middleware
        next();
    } catch (error) {
        // Token is invalid
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
}
