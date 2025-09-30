import { RedmineIssue, IssueRecord } from './types';
import { Storage } from './storage';
import { RedmineService } from './redmine';
import { GitLabService } from './gitlab';
import { logger } from './logger';

export class IssueHandler {
  constructor(
    private storage: Storage,
    private redmineService: RedmineService,
    private gitlabService: GitLabService
  ) {}

  /**
   * 處理新建立的 issue
   */
  async handleNewIssue(issue: RedmineIssue): Promise<void> {
    logger.info(`Processing new issue #${issue.id}: ${issue.subject}`);

    const projectName = issue.project.name;
    const issueRecord: IssueRecord = {
      issueId: issue.id,
      projectName,
      createdAt: new Date().toISOString(),
    };

    // 搜尋對應的 GitLab 專案
    const gitlabProject = await this.gitlabService.findProjectByName(projectName);

    if (gitlabProject) {
      logger.info(`Found GitLab project for issue #${issue.id}: ${gitlabProject.path_with_namespace}`);

      // 建立 Pipeline Trigger
      const trigger = await this.gitlabService.createPipelineTrigger(
        gitlabProject.id,
        `Redmine Issue #${issue.id}: ${issue.subject}`
      );

      if (trigger) {
        // 更新 issue record
        issueRecord.gitlabProjectId = gitlabProject.id;
        issueRecord.gitlabProjectPath = gitlabProject.path_with_namespace;
        issueRecord.triggerId = trigger.id;
        issueRecord.triggerToken = trigger.token;

        // 觸發 Pipeline
        const pipelineTriggered = await this.gitlabService.triggerPipeline(
          gitlabProject.id,
          trigger.token,
          gitlabProject.default_branch || 'main'
        );

        if (pipelineTriggered) {
          logger.info(`Pipeline triggered successfully for issue #${issue.id}`);
        } else {
          logger.warn(`Failed to trigger pipeline for issue #${issue.id}`);
        }
      } else {
        logger.warn(`Failed to create pipeline trigger for issue #${issue.id}`);
      }
    } else {
      logger.warn(`No GitLab project found for Redmine project: ${projectName}`);
    }

    // 儲存 issue record
    this.storage.addIssue(issueRecord);
  }

  /**
   * 處理被移除的 issue
   */
  async handleRemovedIssue(issueId: number): Promise<void> {
    logger.info(`Processing removed issue #${issueId}`);

    const issueRecord = this.storage.getIssue(issueId);
    if (!issueRecord) {
      logger.warn(`Issue #${issueId} not found in storage`);
      return;
    }

    // 如果有建立 trigger，則刪除它
    if (issueRecord.gitlabProjectId && issueRecord.triggerId) {
      logger.info(
        `Cleaning up pipeline trigger ${issueRecord.triggerId} for issue #${issueId} from project ${issueRecord.gitlabProjectPath}`
      );

      const deleted = await this.gitlabService.deletePipelineTrigger(issueRecord.gitlabProjectId, issueRecord.triggerId);

      if (deleted) {
        logger.info(`Successfully deleted pipeline trigger for issue #${issueId}`);
      } else {
        logger.error(`Failed to delete pipeline trigger for issue #${issueId}`);
      }
    }

    // 從 storage 中移除
    this.storage.removeIssue(issueId);
  }

  /**
   * 處理新 issue 的 webhook 通知
   */
  async notifyNewIssues(newIssues: RedmineIssue[]): Promise<void> {
    if (newIssues.length === 0) {
      return;
    }

    const success = await this.redmineService.notifyWebhook(newIssues);
    if (success) {
      logger.info(`Webhook notification sent for ${newIssues.length} new issues`);
    } else {
      logger.warn(`Failed to send webhook notification for ${newIssues.length} new issues`);
    }
  }
}
