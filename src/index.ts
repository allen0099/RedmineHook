import fs from 'fs';
import path from 'path';
import { ScheduledTask } from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import cron from 'node-cron';

dotenv.config();

const REDMINE_API_KEY: string = process.env.REDMINE_API_KEY || '';
const REDMINE_URL: string = process.env.REDMINE_URL || '';
const WEBHOOK_URL: string | undefined = process.env.WEBHOOK_URL;
const CRON_SCHEDULE: string = process.env.CRON_SCHEDULE || '*/5 * * * *';
const KNOWN_ISSUES_FILE = path.resolve(__dirname, '../known_issues.json');

let knownIssueIds = loadKnownIssueIds();

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, ...args: any[]) {
  const now = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}] [${now}]`;
  if (level === 'debug' && !process.env.DEBUG) return;
  // eslint-disable-next-line no-console
  (console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'])(prefix, ...args);
}

function loadKnownIssueIds(): Set<number> {
  try {
    if (fs.existsSync(KNOWN_ISSUES_FILE)) {
      const data = fs.readFileSync(KNOWN_ISSUES_FILE, 'utf-8');
      const arr = JSON.parse(data);
      if (Array.isArray(arr)) {
        return new Set<number>(arr);
      }
    }
  } catch (e) {
    log('warn', 'Failed to load known issues file:', e);
  }
  return new Set<number>();
}

function saveKnownIssueIds(ids: Set<number>) {
  try {
    fs.writeFileSync(KNOWN_ISSUES_FILE, JSON.stringify(Array.from(ids), null, 2), 'utf-8');
    log('debug', 'Known issues saved to disk.');
  } catch (e) {
    log('error', 'Failed to save known issues file:', e);
  }
}

async function fetchAssignedIssues(): Promise<any[]> {
  try {
    log('info', 'Fetching assigned issues from Redmine...');
    const res = await axios.get(`${REDMINE_URL}/issues.json?assigned_to_id=me&status_id=open`, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    log('debug', 'Redmine API response:', res.data);
    return res.data.issues || [];
  } catch (err: any) {
    log('error', 'Error fetching Redmine issues:', err.message);
    return [];
  }
}

async function notifyWebhook(newIssues: any[]): Promise<boolean> {
  if (!WEBHOOK_URL) {
    log('warn', 'WEBHOOK_URL is not defined. Skipping webhook call.');
    return false;
  }
  try {
    log('info', `Calling webhook: ${WEBHOOK_URL} with ${newIssues.length} new issues.`);
    await axios.post(WEBHOOK_URL, { issues: newIssues });
    log('info', 'Webhook called for new issues:', newIssues.map((i) => i.id));
    return true;
  } catch (err: any) {
    log('error', 'Error calling webhook:', err.message);
    return false;
  }
}

async function checkForNewIssues(task?: ScheduledTask) {
  log('info', 'Checking for new issues...');
  const issues = await fetchAssignedIssues();
  const currentIds = new Set<number>(issues.map((i: any) => i.id));
  log('debug', 'Current Redmine issues:', Array.from(currentIds));

  // Find issues that are not in knownIssueIds
  const unknownIssues = issues.filter((i: any) => !knownIssueIds.has(i.id));
  if (unknownIssues.length > 0) {
    log('info', `Found ${unknownIssues.length} unknown issue(s):`, unknownIssues.map((i: any) => i.id));
    const success = await notifyWebhook(unknownIssues);
    if (success) {
      // Add these ids to knownIssueIds
      unknownIssues.forEach((i: any) => knownIssueIds.add(i.id));
      saveKnownIssueIds(knownIssueIds);
      log('debug', 'Updated knownIssueIds:', Array.from(knownIssueIds));
    }
  } else {
    log('info', 'No new issues to notify.');
  }

  // Remove ids from knownIssueIds that are no longer in Redmine
  const before = knownIssueIds.size;
  let changed = false;
  for (const id of Array.from(knownIssueIds)) {
    if (!currentIds.has(id)) {
      knownIssueIds.delete(id);
      changed = true;
      log('debug', `Issue id ${id} removed from knownIssueIds (no longer assigned).`);
    }
  }
  if (changed) {
    saveKnownIssueIds(knownIssueIds);
    log('info', `Known issue list updated. Now tracking:`, Array.from(knownIssueIds));
  }

  // Log next scheduled run time
  if (task) {
    const next = (task as any).nextDates ? (task as any).nextDates().toDate() : undefined;
    if (next) {
      log('info', `Next scheduled run: ${next.toLocaleString()}`);
    }
  }
}

log('info', `Redmine Issue Watcher started. Schedule: ${CRON_SCHEDULE}`);
const task = cron.schedule(CRON_SCHEDULE, () => checkForNewIssues(task));
checkForNewIssues(task);
