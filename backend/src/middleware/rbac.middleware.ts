import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response.utils';

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    // PLATFORM_ADMIN bypasses all role checks
    if (req.user.role === 'PLATFORM_ADMIN') {
      next();
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }
    next();
  };
};

export const requirePlatformAdmin = () => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    if (req.user.role !== 'PLATFORM_ADMIN') {
      sendError(res, 'Platform admin access required', 403);
      return;
    }
    next();
  };
};

// Validates that the authenticated user belongs to the org in the route param.
// PLATFORM_ADMIN bypasses this check.
export const requireOrgAccess = (paramName: string = 'orgId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    if (req.user.role === 'PLATFORM_ADMIN') {
      next();
      return;
    }
    const orgId = req.params[paramName];
    if (!orgId) {
      sendError(res, 'Organization context required', 400);
      return;
    }
    if (req.user.organizationId !== orgId) {
      sendError(res, 'Access denied to this organization', 403);
      return;
    }
    next();
  };
};
