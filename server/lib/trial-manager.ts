// Trial Manager: Daily trial session for FREE users
// Tracks trial usage per user/IP with daily reset

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TrialRecord {
  userId?: string;
  ip?: string;
  used: boolean;
  startTime?: number;
  endTime?: number;
  date: string; // YYYY-MM-DD format
}

const TRIAL_FILE = path.join(__dirname, '../../trial-data.json');
const TRIAL_DURATION_MS = parseInt(process.env.TRIAL_DURATION_MIN || '3', 10) * 60 * 1000;

// In-memory cache (for performance)
let trialCache: Map<string, TrialRecord> = new Map();

// Load trial data from disk
function loadTrialData(): void {
  try {
    if (fs.existsSync(TRIAL_FILE)) {
      const data = fs.readFileSync(TRIAL_FILE, 'utf-8');
      const records: Record<string, TrialRecord> = JSON.parse(data);
      trialCache = new Map(Object.entries(records));
    }
  } catch (error) {
    console.error('[trial] Failed to load trial data:', error);
    trialCache = new Map();
  }
}

// Save trial data to disk
function saveTrialData(): void {
  try {
    const records = Object.fromEntries(trialCache);
    fs.writeFileSync(TRIAL_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (error) {
    console.error('[trial] Failed to save trial data:', error);
  }
}

// Get current date string (YYYY-MM-DD) in America/Chicago timezone
function getCurrentDate(): string {
  const tz = process.env.TZ || 'America/Chicago';
  const now = new Date();
  // Simple timezone offset (for production, use a proper library like date-fns-tz)
  const dateStr = now.toISOString().split('T')[0];
  return dateStr;
}

// Get user identifier (IP or user ID)
function getUserKey(userId?: string, ip?: string): string {
  return userId || ip || 'anonymous';
}

// Initialize: load data on startup
loadTrialData();

// Schedule daily reset at midnight
function scheduleDailyReset(): void {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  setTimeout(() => {
    // Clean up old records (keep only today)
    const today = getCurrentDate();
    const toDelete: string[] = [];
    trialCache.forEach((record, key) => {
      if (record.date !== today) {
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => trialCache.delete(key));
    saveTrialData();
    
    // Schedule next reset
    scheduleDailyReset();
  }, msUntilMidnight);
}

scheduleDailyReset();

/**
 * Check if user is eligible for trial today
 */
export function isTrialEligible(userId?: string, ip?: string): boolean {
  if (process.env.TRIAL_ENABLED !== 'true') return false;
  
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const record = trialCache.get(`${key}:${today}`);
  
  return !record || !record.used;
}

/**
 * Check if user has used trial today
 */
export function hasUsedTrialToday(userId?: string, ip?: string): boolean {
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const record = trialCache.get(`${key}:${today}`);
  
  return record?.used === true;
}

/**
 * Get remaining trial time in milliseconds
 */
export function getTrialRemainingMs(userId?: string, ip?: string): number {
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const record = trialCache.get(`${key}:${today}`);
  
  if (!record || !record.startTime) return TRIAL_DURATION_MS;
  
  const elapsed = Date.now() - record.startTime;
  return Math.max(0, TRIAL_DURATION_MS - elapsed);
}

/**
 * Start trial session
 */
export function startTrial(userId?: string, ip?: string): boolean {
  if (!isTrialEligible(userId, ip)) return false;
  
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const cacheKey = `${key}:${today}`;
  
  const record: TrialRecord = {
    userId,
    ip,
    used: false,
    startTime: Date.now(),
    date: today,
  };
  
  trialCache.set(cacheKey, record);
  saveTrialData();
  
  console.log(`[trial] Started trial for ${key} on ${today}`);
  return true;
}

/**
 * Mark trial as used (when user exceeds time or uses premium feature)
 */
export function markTrialUsed(userId?: string, ip?: string): void {
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const cacheKey = `${key}:${today}`;
  
  const record = trialCache.get(cacheKey) || {
    userId,
    ip,
    used: false,
    startTime: Date.now(),
    date: today,
  };
  
  record.used = true;
  record.endTime = Date.now();
  
  trialCache.set(cacheKey, record);
  saveTrialData();
  
  console.log(`[trial] Marked trial as used for ${key} on ${today}`);
}

/**
 * Check if trial is still active (not expired and not used)
 */
export function isTrialActive(userId?: string, ip?: string): boolean {
  if (!isTrialEligible(userId, ip)) return false;
  
  const remaining = getTrialRemainingMs(userId, ip);
  return remaining > 0;
}

/**
 * Get trial info for API response
 */
export function getTrialInfo(userId?: string, ip?: string): {
  eligible: boolean;
  usedToday: boolean;
  remainingMs: number;
  startTime?: number;
} {
  const eligible = isTrialEligible(userId, ip);
  const usedToday = hasUsedTrialToday(userId, ip);
  const remaining = getTrialRemainingMs(userId, ip);
  
  const key = getUserKey(userId, ip);
  const today = getCurrentDate();
  const record = trialCache.get(`${key}:${today}`);
  
  return {
    eligible,
    usedToday,
    remainingMs: remaining,
    startTime: record?.startTime,
  };
}

