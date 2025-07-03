import { FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "crypto";
import { logger } from "#settings";

interface CsrfOptions {
    cookieName?: string;
    headerName?: string;
    cookieOptions?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: boolean | 'lax' | 'strict' | 'none';
        path?: string;
        maxAge?: number;
    };
    ignoreMethods?: string[];
    ignorePaths?: string[];
}

const defaultOptions: CsrfOptions = {
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 // 24 hours
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths: ['/health', '/metrics']
};

/**
 * Generate a secure random token
 */
function generateToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * CSRF protection middleware for Fastify
 * @returns Object with validation result
 */
export function csrfProtection(request: FastifyRequest, reply: FastifyReply, options: CsrfOptions = {}): { valid: boolean } {
    const config = { ...defaultOptions, ...options };
    
        // Skip CSRF check for ignored methods
        if (config.ignoreMethods?.includes(request.method)) {
            return { valid: true };
        }
        
        // Skip CSRF check for ignored paths
        if (config.ignorePaths?.some(path => request.url.startsWith(path))) {
            return { valid: true };
        }
        
        // Get token from cookie
        const cookieToken = request.cookies[config.cookieName || 'csrf-token'];
        
        // For GET requests, set a new token if none exists
        if (request.method === 'GET' && !cookieToken) {
            const newToken = generateToken();
            reply.cookie(config.cookieName || 'csrf-token', newToken, config.cookieOptions);
            return { valid: true };
        }
        
        // For non-GET requests, validate the token
        if (request.method !== 'GET') {
            const headerToken = request.headers[config.headerName?.toLowerCase() || 'x-csrf-token'];
            
            // If no token in cookie or header doesn't match cookie
            if (!cookieToken || headerToken !== cookieToken) {
                logger.warn(`CSRF validation failed: ${request.method} ${request.url}`);
                return { valid: false };
            }
            
            return { valid: true };
        }
        
        return { valid: true };
}