import { body } from "express-validator";

export const validateCreateTrainer = [
    body('name').notEmpty().withMessage('Name cannot be empty'),
    body('phoneNumber').notEmpty().withMessage('PhoneNumber cannot be empty').isLength({min: 10, max: 10}).withMessage('10 characters required in phone number.'),
    body('password').notEmpty().withMessage('Password cannot be empty'),
    body('uniqueId').notEmpty().withMessage('UniqueId cannot be empty'),
    body('type').isInt({min: 1, max: 2}).withMessage('Type must be either 1 or 2'),
    body('status').isInt({min: 1, max: 2}).withMessage('Status must be an integer')
];

export const validateLoginTrainer = [
    body('phoneNumber').notEmpty().withMessage('PhoneNumber cannot be empty'),
    body('password').notEmpty().withMessage('Password cannot be empty'),
];

export const validateUpdateTrainer = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty if provided'),
    body('phoneNumber').optional().notEmpty().withMessage('PhoneNumber cannot be empty if provided'),
    body('password').optional().notEmpty().withMessage('Password cannot be empty if provided'),
    body('uniqueId').optional().notEmpty().withMessage('UniqueId cannot be empty if provided'),
    body('type').optional().notEmpty().withMessage('Type cannot be empty if provided'),
    body('status').optional().isInt().withMessage('Status must be an integer if provided')
];

export const validateCreateUser = [
    body('name').notEmpty().withMessage('Name cannot be empty'),
    body('phoneNumber').notEmpty().withMessage('PhoneNumber cannot be empty'),
    body('status').isInt().withMessage('Status must be an integer'),
    body('numberOfDevices').isInt().withMessage('NumberOfDevices must be an integer')
];

export const validateUpdateUser = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty if provided'),
    body('phoneNumber').optional().notEmpty().withMessage('PhoneNumber cannot be empty if provided'),
    body('status').optional().isInt().withMessage('Status must be an integer if provided'),
    body('numberOfDevices').optional().isInt().withMessage('NumberOfDevices must be an integer if provided')
];

export const validateCreateGameplay = [
    body('variationId').isInt().withMessage('VariationId must be an integer'),
];

export const validateUpdateGameplay = [
    body('variationId').optional().isInt().withMessage('VariationId must be an integer if provided'),
];

export const validateCreateVariation = [
    body('gameType').notEmpty().withMessage('GameType cannot be empty'),
    body('customId').notEmpty().withMessage('customId cannot be empty'),
    body('additionalDetails').isObject().withMessage('AdditionalDetails must be a valid JSON object').custom((value) => {
        if (!value.hasOwnProperty('backgroundImage')) {
            return false;
        }
        return true;
    }).withMessage('additionalDetails must contain backgroundImage'),
    body('siteBanner').isString().withMessage('siteBanner must be a string'),
    body('mobileBanner').isString().withMessage('mobileBanner must be a string'),
    body('variationName').notEmpty().withMessage('VariationName cannot be empty'),
    body('status').notEmpty().withMessage('Status cannot be empty')
];

export const validateUpdateVariation = [
    body('gameType').optional().notEmpty().withMessage('GameType cannot be empty if provided'),
    body('customId').optional().notEmpty().withMessage('CustomId cannot be empty if provided'),
    body('additionalDetails').optional().isObject().withMessage('AdditionalDetails must be a valid object if provided'),
    body('siteBanner').optional().isString().withMessage('siteBanner must be a valid string if provided'),
    body('mobileBanner').optional().isString().withMessage('mobileBanner must be a valid string if provided'),
    body('variationName').optional().notEmpty().withMessage('VariationName cannot be empty if provided'),
    body('status').optional().notEmpty().withMessage('Status cannot be empty if provided')
];

export const validateCreateSnakesLadders = [
    body('snakePositions').isArray().withMessage('SnakePositions must be an array of integers'),
    body('ladderPositions').isArray().withMessage('LadderPositions must be an array of integers')
];

export const validateUpdateSnakesLadders = [
    body('snakePositions').optional().isArray().withMessage('SnakePositions must be an array of integers if provided'),
    body('ladderPositions').optional().isArray().withMessage('LadderPositions must be an array of integers if provided')
];

