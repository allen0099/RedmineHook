import axios from 'axios';
import { config } from './config';
import { logger } from './logger';
import { RedmineIssue } from './types';

export class RedmineService {
  async fetchAssignedIssues(): Promise<RedmineIssue[]> {
    try {
      logger.info('Fetching assigned issues from Redmine...');
      const res = await axios.get(`${config.redmine.url}/issues.json?assigned_to_id=me&status_id=open`, {
        headers: { 'X-Redmine-API-Key': config.redmine.apiKey },
      });

      logger.debug('Redmine API response:', res.data);
      const issues = res.data.issues || [];
      logger.info(`Fetched ${issues.length} assigned issues from Redmine`);
      return issues;
    } catch (err: any) {
      logger.error('Error fetching Redmine issues:', err.message);
      return [];
    }
  }

  async notifyWebhook(newIssues: RedmineIssue[]): Promise<boolean> {
    if (!config.webhook.url) {
      logger.warn('WEBHOOK_URL is not defined. Skipping webhook call.');
      return false;
    }

    try {
      logger.info(`Calling webhook: ${config.webhook.url} with ${newIssues.length} new issues`);
      await axios.post(config.webhook.url, { issues: newIssues });
      logger.info('Webhook called for new issues:', newIssues.map((i) => i.id));
      return true;
    } catch (err: any) {
      logger.error('Error calling webhook:', err.message);
      return false;
    }
  }
}
