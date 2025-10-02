import axios, { AxiosInstance } from 'axios';
import { config } from './config';
import { logger } from './logger';
import { GitLabProject, PipelineTrigger } from './types';

export class GitLabService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.gitlab.apiUrl,
      headers: {
        'PRIVATE-TOKEN': config.gitlab.privateToken,
      },
    });
  }

  /**
   * 搜尋 GitLab 專案（依專案名稱）
   */
  async findProjectByName(projectName: string): Promise<GitLabProject | null> {
    try {
      logger.debug(`Searching for GitLab project: ${projectName}`);
      const res = await this.client.get('/projects', {
        params: {
          search: projectName,
          per_page: 100,
        },
      });

      const projects: GitLabProject[] = res.data;

      // 尋找完全匹配的專案名稱
      const exactMatch = projects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase() || p.path.toLowerCase() === projectName.toLowerCase()
      );

      if (exactMatch) {
        logger.info(`Found exact GitLab project match: ${exactMatch.path_with_namespace} (ID: ${exactMatch.id})`);
        return exactMatch;
      }

      // 如果沒有完全匹配，返回第一個結果
      if (projects.length > 0) {
        logger.info(`Found similar GitLab project: ${projects[0].path_with_namespace} (ID: ${projects[0].id})`);
        return projects[0];
      }

      logger.warn(`No GitLab project found for: ${projectName}`);
      return null;
    } catch (err: any) {
      logger.error(`Error searching for GitLab project "${projectName}":`, err.message);
      return null;
    }
  }

  /**
   * 建立 Pipeline Trigger
   */
  async createPipelineTrigger(projectId: number, description: string): Promise<PipelineTrigger | null> {
    try {
      logger.info(`Creating pipeline trigger for project ID ${projectId}...`);
      const res = await this.client.post(`/projects/${projectId}/triggers`, {
        description,
      });

      const trigger: PipelineTrigger = res.data;
      logger.info(`Created pipeline trigger (ID: ${trigger.id}) for project ${projectId}`);
      return trigger;
    } catch (err: any) {
      logger.error(`Error creating pipeline trigger for project ${projectId}:`, err.message);
      return null;
    }
  }

  /**
   * 刪除 Pipeline Trigger
   */
  async deletePipelineTrigger(projectId: number, triggerId: number): Promise<boolean> {
    try {
      logger.info(`Deleting pipeline trigger ${triggerId} from project ${projectId}...`);
      await this.client.delete(`/projects/${projectId}/triggers/${triggerId}`);
      logger.info(`Deleted pipeline trigger ${triggerId} from project ${projectId}`);
      return true;
    } catch (err: any) {
      logger.error(`Error deleting pipeline trigger ${triggerId} from project ${projectId}:`, err.message);
      return false;
    }
  }

  /**
   * 觸發 Pipeline
   */
  async triggerPipeline(projectId: number, token: string, ref: string, variables?: Record<string, string>): Promise<boolean> {
    try {
      logger.info(`Triggering pipeline for project ${projectId} on ref ${ref}...`);
      
      // 構建請求參數
      const params: any = {
        token,
        ref,
      };

      // 將變數轉換為 variables[key]=value 格式
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          params[`variables[${key}]`] = value;
        }
        logger.debug('Pipeline variables:', variables);
      }

      const res = await this.client.post(`/projects/${projectId}/trigger/pipeline`, null, {
        params,
      });

      logger.info(`Pipeline triggered successfully for project ${projectId}`);
      logger.debug('Pipeline response data:', res.data);
      return true;
    } catch (err: any) {
      logger.error(`Error triggering pipeline for project ${projectId}:`, err.message);
      if (err.response) {
        logger.error('Response status:', err.response.status);
        logger.error('Response data:', err.response.data);
      }
      return false;
    }
  }
}
