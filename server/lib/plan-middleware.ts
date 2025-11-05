// Lightweight middleware to require a minimum plan level for protected routes.
// Usage: import { requirePlan, PlanLevel } from './plan-middleware';
// app.use('/protected', requirePlan('pro'), handler);

import type { Request, Response, NextFunction } from "express";

/**
 * Plan levels: 'free' < 'pro' < 'elite'
 */
export type PlanLevel = 'free' | 'pro' | 'elite';

const order: Record<PlanLevel, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

/**
 * resolvePlanFromReq - helper that determines the effective plan for the request.
 * Current logic:
 *  - If req.query.plan present -> use it
 *  - Otherwise read process.env.DEFAULT_PLAN (fallback 'free')
 *  - Future: prefer authenticated user plan if req.user exists
 */
export function resolvePlanFromReq(req: Request): PlanLevel {
  const q = (req.query?.plan as string | undefined) || process.env.DEFAULT_PLAN || 'FREE';
  const normalized = String(q).toLowerCase();
  if (normalized === 'elite') return 'elite';
  if (normalized === 'pro') return 'pro';
  return 'free';
}

/**
 * requirePlan(minLevel) - middleware that enforces a required plan level.
 * If the request plan is lower than required, responds 402 with reason TRIAL_ENDED
 * (or 403 depending on context). Uses 402 for upgrade-related gating to match
 * the existing trial flow.
 */
export function requirePlan(minLevel: PlanLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = resolvePlanFromReq(req);
    if (order[plan] < order[minLevel]) {
      // Use 402 to indicate upgrade required (consistent with trial behavior)
      return res.status(402).json({
        reason: "UPGRADE_REQUIRED",
        message: `This feature requires plan=${minLevel}. Your plan=${plan}. Upgrade to continue.`,
      });
    }
    return next();
  };
}
