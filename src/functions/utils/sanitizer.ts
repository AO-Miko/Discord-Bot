/**
 * Input sanitization utility to protect against malicious user inputs
 */

/**
 * Sanitizes a string input to prevent injection attacks
 * @param input The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string | null | undefined): string {
    if (input === null || input === undefined) {
        return '';
    }
    
    // Convert to string if not already
    const str = String(input);
    
    // Replace HTML special characters
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        // Prevent Discord markdown injection
        .replace(/\*/g, '\\*')
        .replace(/`/g, '\\`')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\~')
        .replace(/\|/g, '\\|');
}

/**
 * Sanitizes an object by recursively sanitizing all string properties
 * @param obj The object to sanitize
 * @returns A new sanitized object
 */
export function sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return sanitizeString(obj) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj as Record<string, any>)) {
            result[key] = sanitizeObject(value);
        }
        return result as T;
    }
    
    return obj;
}

/**
 * Validates and sanitizes a Discord ID
 * @param id The Discord ID to validate
 * @returns The validated ID or null if invalid
 */
export function validateDiscordId(id: string | null | undefined): string | null {
    if (!id) return null;
    
    // Discord IDs are numeric strings of specific length
    const cleanId = String(id).trim();
    if (/^\d{17,20}$/.test(cleanId)) {
        return cleanId;
    }
    
    return null;
}

/**
 * Validates and sanitizes a channel name
 * @param name The channel name to validate
 * @returns The validated channel name or null if invalid
 */
export function validateChannelName(name: string | null | undefined): string | null {
    if (!name) return null;
    
    // Discord channel names have specific requirements
    const cleanName = String(name).trim().toLowerCase();
    
    // Channel names must be between 1-100 characters and can only contain certain characters
    if (cleanName.length > 0 && cleanName.length <= 100 && /^[a-z0-9_-]+$/.test(cleanName)) {
        return cleanName;
    }
    
    return null;
}

/**
 * Validates a URL for safety
 * @param url The URL to validate
 * @returns The validated URL or null if invalid/unsafe
 */
export function validateUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    
    try {
        const parsedUrl = new URL(String(url));
        
        // Only allow http and https protocols
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }
        
        // Additional checks could be added here (e.g., domain allowlist)
        
        return parsedUrl.toString();
    } catch {
        return null;
    }
}