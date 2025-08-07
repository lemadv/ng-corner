import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiting
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false
});

/**
 * Stricter rate limiting for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false
});

/**
 * Password reset rate limiting
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts',
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Email verification rate limiting
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 verification emails per hour
  message: {
    error: 'Too many verification requests',
    message: 'Too many email verification requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Validate request body against common attacks
 */
export const validateRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      res.status(413).json({
        error: 'Payload too large',
        message: 'Request payload exceeds maximum size limit'
      });
      return;
    }

    next(); // Allow everything else
  } catch (error) {
    console.error('Request validation error:', error);
    res.status(400).json({
      error: 'Request validation failed',
      message: 'Invalid request format'
    });
  }
};


/**
 * Security headers middleware
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );

  next();
};

/**
 * Log security events
 */
export const logSecurityEvent = (
  eventType: string,
  details: any,
  req: Request
): void => {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    type: eventType,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    details
  };

  // In production, you might want to send this to a security monitoring service
  console.warn('Security Event:', JSON.stringify(securityEvent, null, 2));
};

/**
 * Detect and log suspicious activity
 */
export const detectSuspiciousActivity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress;

  // Detect common bot patterns
  const botPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];

  const isSuspiciousBot = botPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspiciousBot && !req.path.startsWith('/api/public')) {
    logSecurityEvent('suspicious_bot_access', {
      userAgent,
      ip,
      path: req.path
    }, req);
  }

  // Detect missing common headers
  if (!req.get('Accept') && !req.get('User-Agent')) {
    logSecurityEvent('missing_common_headers', {
      headers: req.headers
    }, req);
  }

  next();
};

/**
 * CORS configuration for different environments
 */
export const getCorsOptions = () => {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://www.ng-corner.com','https://www.staging.ng-corner.com'] // Production domains
    : ['http://localhost:4200', 'http://127.0.0.1:4200']; // Development

  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const msg = `The CORS policy for this site does not allow access from the specified Origin. ${origin}`;
      return callback(new Error(msg), false);
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control'
    ]
  };
};
