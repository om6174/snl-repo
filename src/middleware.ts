import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceType } from './types';
import { validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    // Extract the file extension from the original file name
    const fileExtension = path.extname(file.originalname);

    // Construct the new file name with timestamp and file type from params
    const newFileName = `${Date.now()}-${req.params.fileType}${fileExtension}`;

    // Callback with the new file name
    cb(null, newFileName);
}
})

// Create and export the Multer instance with the configured storage
export const upload = multer({ storage });

// Middleware function that passes query, params, and body to the service function
export const handleService = (serviceFunction: (params: ServiceType) => Promise<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // If there are validation errors, return a 400 Bad Request response
                return res.status(400).json({ errors: errors.array() });
            }
            // Call the service function with query, params, and body from the request
            const result = await serviceFunction({query: req.query, params: req.params, body: req.body, locals: res.locals, files: req.files});

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
        if(allowedRoles.length === 0){
            return next();
        }
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
            res.locals.role = decoded.role;
    
            // Move to the next middleware
            next();
        } catch (error) {
            // Token is invalid
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }
    }
}
