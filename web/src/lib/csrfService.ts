/**
 * @fileoverview CSRF Protection Service.
 *
 * Implements a stateless double-submit cookie pattern for CSRF protection.
 * This is a robust defense against CSRF attacks that works well with SPAs.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { nanoid } from 'nanoid';
import { serialize, parse } from 'cookie';

const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

class CsrfService {
  /**
   * Generates a new CSRF token and sets it as a secure, HttpOnly cookie.
   * @returns The generated CSRF token.
   */
  generateToken(res: Response): string {
    const token = nanoid(32);

    const cookie = serialize(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    res.headers.append('Set-Cookie', cookie);

    return token;
  }

  /**
   * Validates the CSRF token from the request headers against the token in the cookie.
   * @param req - The incoming NextRequest.
   * @returns True if the tokens match, false otherwise.
   */
  validateToken(req: Request): boolean {
    const headerToken = req.headers.get(CSRF_HEADER_NAME);
    const cookieHeader = req.headers.get('cookie');

    if (!headerToken || !cookieHeader) {
      return false;
    }

    const cookies = parse(cookieHeader);
    const cookieToken = cookies[CSRF_COOKIE_NAME];

    if (!cookieToken) {
      return false;
    }

    return headerToken === cookieToken;
  }

  /**
   * A helper to add the CSRF token to the response so the client can use it.
   * This is typically done on pages with forms.
   */
  addTokenToResponse(res: Response, req: Request): string {
    const cookieHeader = req.headers.get('cookie');
    let token: string;
    
    if (cookieHeader) {
      const cookies = parse(cookieHeader);
      const existingToken = cookies[CSRF_COOKIE_NAME];
      if (existingToken) {
        token = existingToken;
      } else {
        token = this.generateToken(res);
      }
    } else {
      token = this.generateToken(res);
    }
    
    return token;
  }
}

export const csrfService = new CsrfService();
export { CSRF_HEADER_NAME };
