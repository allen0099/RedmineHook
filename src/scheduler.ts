import cron, { ScheduledTask } from 'node-cron';
import { RedmineService } from './redmine';
import { GitLabService } from './gitlab';
import { Storage } from './storage';
import { IssueHandler } from './issueHandler';
import { logger } from './logger';
import { config } from './config';

export class Scheduler {
  private task?: ScheduledTask;
  private storage: Storage;
  private redmineService: RedmineService;
  private gitlabService: GitLabService;
  private issueHandler: IssueHandler;

  constructor() {
    this.storage = new Storage();
    this.redmineService = new RedmineService();
    this.gitlabService = new GitLabService();
    this.issueHandler = new IssueHandler(this.storage, this.redmineService, this.gitlabService);
  }

  /**
   * 檢查新 issue 的主要邏輯
   */
  async checkForNewIssues(): Promise<void> {
    logger.info('Checking for new issues...');

    // 從 Redmine 取得目前的 issues
    const currentIssues = await this.redmineService.fetchAssignedIssues();
    const currentIds = new Set<number>(currentIssues.map((i) => i.id));
    const knownIds = this.storage.getIssueIds();

    logger.debug('Current Redmine issues:', Array.from(currentIds));
    logger.debug('Known issues:', Array.from(knownIds));

    // 找出新的 issues
    const newIssues = currentIssues.filter((i) => !knownIds.has(i.id));

    if (newIssues.length > 0) {
      logger.info(`Found ${newIssues.length} new issue(s):`, newIssues.map((i) => i.id));

      // 處理每個新 issue
      for (const issue of newIssues) {
        await this.issueHandler.handleNewIssue(issue);
      }

      // 通知 webhook
      await this.issueHandler.notifyNewIssues(newIssues);
    } else {
      logger.info('No new issues found');
    }

    // 找出已移除的 issues（在 known 中但不在 current 中）
    const removedIds = Array.from(knownIds).filter((id) => !currentIds.has(id));

    if (removedIds.length > 0) {
      logger.info(`Found ${removedIds.length} removed issue(s):`, removedIds);

      // 處理每個被移除的 issue
      for (const issueId of removedIds) {
        await this.issueHandler.handleRemovedIssue(issueId);
      }
    }

    // 記錄下次執行時間
    this.logNextRun();
  }

  /**
   * 記錄下次執行時間
   */
  private logNextRun(): void {
    if (this.task) {
      const next = (this.task as any).nextDates ? (this.task as any).nextDates().toDate() : undefined;
      if (next) {
        logger.info(`Next scheduled run: ${next.toLocaleString()}`);
      }
    }
  }

  /**
   * 啟動排程器
   */
  start(): void {
    logger.info(`Redmine Issue Watcher started. Schedule: ${config.cron.schedule}`);

    // 建立排程任務
    this.task = cron.schedule(config.cron.schedule, async () => {
      try {
        await this.checkForNewIssues();
      } catch (error) {
        logger.error('Error during scheduled check:', error);
      }
    });

    // 立即執行一次
    this.checkForNewIssues().catch((error) => {
      logger.error('Error during initial check:', error);
    });
  }

  /**
   * 停止排程器
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Scheduler stopped');
    }
  }
}
