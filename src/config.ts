import dotenv from 'dotenv';
import path from 'path';
import { logger } from './logger';

dotenv.config();

export interface Config {
  redmine: {
    apiKey: string;
    url: string;
  };
  gitlab: {
    apiUrl: string;
    privateToken: string;
  };
  webhook: {
    url?: string;
  };
  cron: {
    schedule: string;
  };
  debug: boolean;
  knownIssuesFile: string;
}

export const config: Config = {
  redmine: {
    apiKey: process.env.REDMINE_API_KEY || '',
    url: process.env.REDMINE_URL || '',
  },
  gitlab: {
    apiUrl: process.env.GITLAB_API_URL || '',
    privateToken: process.env.GITLAB_PRIVATE_TOKEN || '',
  },
  webhook: {
    url: process.env.WEBHOOK_URL,
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '* * * * *',
  },
  debug: process.env.DEBUG === 'true',
  knownIssuesFile: process.env.KNOWN_ISSUES_FILE || path.resolve(__dirname, '../known_issues.json'),
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.redmine.apiKey) {
    errors.push('REDMINE_API_KEY is required');
  }
  if (!config.redmine.url) {
    errors.push('REDMINE_URL is required');
  }
  if (!config.gitlab.apiUrl) {
    errors.push('GITLAB_API_URL is required');
  }
  if (!config.gitlab.privateToken) {
    errors.push('GITLAB_PRIVATE_TOKEN is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
