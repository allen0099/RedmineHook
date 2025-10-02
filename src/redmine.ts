import axios from 'axios';
import { config } from './config';
import { logger } from './logger';
import { RedmineIssue, RedmineIssueStatus, StatusCache } from './types';

const GITLAB_FAILED_PREFIX = '[GITLAB FAILED]';
// 定義 InProgress 狀態名稱的模式
const IN_PROGRESS_PATTERNS = ['inprogress', 'in progress', 'in-progress'];

export class RedmineService {
  private statusCache: StatusCache | null = null;

  /**
   * 獲取並快取所有 issue 狀態
   */
  async fetchAndCacheStatuses(): Promise<void> {
    try {
      logger.info('Fetching issue statuses from Redmine...');
      const res = await axios.get(`${config.redmine.url}/issue_statuses.json`, {
        headers: { 'X-Redmine-API-Key': config.redmine.apiKey },
      });

      const statuses: RedmineIssueStatus[] = res.data.issue_statuses || [];
      logger.info(`Fetched ${statuses.length} issue statuses from Redmine`);
      logger.debug('Available statuses:', statuses.map(s => `${s.id}: ${s.name}`).join(', '));

      // 尋找 InProgress 狀態
      const inProgressStatus = statuses.find(
        s => IN_PROGRESS_PATTERNS.includes(s.name.toLowerCase())
      );

      this.statusCache = {
        statuses,
        inProgressId: inProgressStatus?.id || null,
        lastFetched: new Date().toISOString(),
      };

      if (inProgressStatus) {
        logger.info(`Found InProgress status with ID: ${inProgressStatus.id}`);
      } else {
        logger.warn('InProgress status not found in Redmine. Status updates will be skipped.');
        logger.debug('Available status names:', statuses.map(s => s.name).join(', '));
      }
    } catch (err: any) {
      logger.error('Error fetching Redmine statuses:', err.message);
      this.statusCache = {
        statuses: [],
        inProgressId: null,
        lastFetched: new Date().toISOString(),
      };
    }
  }

  /**
   * 獲取 InProgress 狀態 ID
   */
  getInProgressStatusId(): number | null {
    return this.statusCache?.inProgressId || null;
  }

  /**
   * 更新 issue 狀態
   */
  async updateIssueStatus(issueId: number, statusId: number): Promise<boolean> {
    try {
      logger.info(`Updating issue #${issueId} status to ${statusId}...`);
      await axios.put(
        `${config.redmine.url}/issues/${issueId}.json`,
        {
          issue: {
            status_id: statusId,
          },
        },
        {
          headers: { 
            'X-Redmine-API-Key': config.redmine.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Successfully updated issue #${issueId} status to ${statusId}`);
      return true;
    } catch (err: any) {
      logger.error(`Error updating issue #${issueId} status:`, err.message);
      return false;
    }
  }

  /**
   * 更新 issue 標題並取消指派
   */
  async markIssueAsGitLabFailed(issueId: number, currentTitle: string): Promise<boolean> {
    try {
      logger.info(`Marking issue #${issueId} as GitLab failed...`);
      
      const newTitle = currentTitle.startsWith(GITLAB_FAILED_PREFIX) 
        ? currentTitle 
        : `${GITLAB_FAILED_PREFIX} ${currentTitle}`;

      await axios.put(
        `${config.redmine.url}/issues/${issueId}.json`,
        {
          issue: {
            subject: newTitle,
            assigned_to_id: null, // 取消指派
          },
        },
        {
          headers: { 
            'X-Redmine-API-Key': config.redmine.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Successfully marked issue #${issueId} as GitLab failed and unassigned`);
      return true;
    } catch (err: any) {
      logger.error(`Error marking issue #${issueId} as GitLab failed:`, err.message);
      return false;
    }
  }

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
