import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

// Validation result interface
interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: string[];
}

/**
 * Generic Zod validation middleware factory
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errors = formatZodErrors(validationResult.error);
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Please check your input and try again',
          details: errors
        });
      }

      // Replace req.body with validated and sanitized data
      req.body = validationResult.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Validation error',
        message: 'An error occurred during input validation'
      });
    }
  };
};

/**
 * Query parameter validation middleware factory
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errors = formatZodErrors(validationResult.error);
        return res.status(400).json({
          error: 'Query validation failed',
          message: 'Please check your query parameters',
          details: errors
        });
      }

      // Replace req.query with validated data
      req.query = validationResult.data;
      next();
    } catch (error) {
      console.error('Query validation middleware error:', error);
      res.status(500).json({
        error: 'Query validation error',
        message: 'An error occurred during query validation'
      });
    }
  };
};

/**
 * Route parameter validation middleware factory
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.params);
      
      if (!validationResult.success) {
        const errors = formatZodErrors(validationResult.error);
        return res.status(400).json({
          error: 'Parameter validation failed',
          message: 'Please check your request parameters',
          details: errors
        });
      }

      // Replace req.params with validated data
      req.params = validationResult.data;
      next();
    } catch (error) {
      console.error('Parameter validation middleware error:', error);
      res.status(500).json({
        error: 'Parameter validation error',
        message: 'An error occurred during parameter validation'
      });
    }
  };
};

/**
 * Combined validation middleware for body, query, and params
 */
export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];

      // Validate body if schema provided
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          errors.push(...formatZodErrors(bodyResult.error));
        } else {
          req.body = bodyResult.data;
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          errors.push(...formatZodErrors(queryResult.error));
        } else {
          req.query = queryResult.data;
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          errors.push(...formatZodErrors(paramsResult.error));
        } else {
          req.params = paramsResult.data;
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Please check your input and try again',
          details: errors
        });
      }

      next();
    } catch (error) {
      console.error('Request validation middleware error:', error);
      res.status(500).json({
        error: 'Validation error',
        message: 'An error occurred during request validation'
      });
    }
  };
};

/**
 * Format Zod errors into user-friendly messages
 */
function formatZodErrors(error: ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
}

/**
 * Sanitize data by removing undefined values and trimming strings
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.trim() as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item)) as T;
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Safe parsing helper function
 */
export function safeParse<T>(schema: ZodSchema<T>, data: unknown): ValidationResult {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        errors: formatZodErrors(result.error)
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['An error occurred during validation']
    };
  }
}

/**
 * Transform validation errors for API responses
 */
export function transformValidationErrors(errors: string[]): {
  error: string;
  message: string;
  details: string[];
} {
  return {
    error: 'Validation failed',
    message: 'Please check your input and try again',
    details: errors
  };
}

/**
 * UUID validation schema helper
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  uuid: uuidSchema,
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  url: z.string().url('Invalid URL format'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonEmptyString: z.string().min(1, 'Cannot be empty').trim(),
  optionalString: z.string().trim().optional(),
  booleanString: z.union([
    z.boolean(),
    z.string().transform((val) => val === 'true')
  ])
};