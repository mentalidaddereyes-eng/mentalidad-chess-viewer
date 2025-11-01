// Cost Saver Pack v6.0: Plan detection and management
// Query param → Cookie → localStorage → default 'free'

import type { PlanMode } from '@shared/types';

const PLAN_COOKIE_NAME = 'planMode';
const PLAN_STORAGE_KEY = 'gm_trainer_plan';
const COOKIE_TTL_DAYS = 7;

/**
 * Get current plan mode from query param → cookie → localStorage → 'free'
 */
export function getPlanMode(): PlanMode {
  // 1. Check query parameter (?plan=pro|free)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam === 'pro' || planParam === 'free') {
      // Save to cookie and localStorage
      setPlanMode(planParam);
      return planParam;
    }
  }

  // 2. Check cookie
  const cookiePlan = getCookie(PLAN_COOKIE_NAME);
  if (cookiePlan === 'pro' || cookiePlan === 'free') {
    return cookiePlan;
  }

  // 3. Check localStorage
  if (typeof window !== 'undefined') {
    const storedPlan = localStorage.getItem(PLAN_STORAGE_KEY);
    if (storedPlan === 'pro' || storedPlan === 'free') {
      // Sync to cookie
      setCookie(PLAN_COOKIE_NAME, storedPlan, COOKIE_TTL_DAYS);
      return storedPlan;
    }
  }

  // 4. Default to 'free'
  const defaultPlan: PlanMode = 'free';
  setPlanMode(defaultPlan);
  return defaultPlan;
}

/**
 * Set plan mode (save to cookie + localStorage)
 */
export function setPlanMode(plan: PlanMode): void {
  if (typeof window === 'undefined') return;

  // Save to cookie (7 days TTL)
  setCookie(PLAN_COOKIE_NAME, plan, COOKIE_TTL_DAYS);

  // Save to localStorage
  localStorage.setItem(PLAN_STORAGE_KEY, plan);

  console.log(`[plan] mode set to: ${plan}`);
}

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  
  return null;
}

/**
 * Set cookie with TTL
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}
