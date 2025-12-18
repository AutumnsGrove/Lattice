/**
 * Sign a JWT payload
 * @param {JwtPayload} payload - The payload to sign
 * @param {string} secret - The secret key
 * @returns {Promise<string>} - The signed JWT token
 */
export function signJwt(payload: JwtPayload, secret: string): Promise<string>;
/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @param {string} secret - The secret key
 * @returns {Promise<JwtPayload|null>} - The decoded payload or null if invalid
 */
export function verifyJwt(token: string, secret: string): Promise<JwtPayload | null>;
export type JwtPayload = {
    sub?: string | undefined;
    email?: string | undefined;
    exp?: number | undefined;
    iat?: number | undefined;
};
