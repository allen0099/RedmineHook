import fs from 'fs';
import { IssueRecord, KnownIssuesData } from './types';
import { logger } from './logger';
import { config } from './config';

export class Storage {
  private data: KnownIssuesData = { issues: [] };

  constructor() {
    this.load();
  }

  private load(): void {
    logger.info("Persisting known issues from file:", config.knownIssuesFile);

    try {
      if (fs.existsSync(config.knownIssuesFile)) {
        const fileContent = fs.readFileSync(config.knownIssuesFile, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // 向後兼容：如果是舊格式（陣列），轉換為新格式
        if (Array.isArray(parsed)) {
          logger.info('Migrating old known_issues format to new format...');
          this.data = {
            issues: parsed.map((id: number) => ({
              issueId: id,
              projectName: 'unknown',
              createdAt: new Date().toISOString(),
            })),
          };
          this.save();
        } else {
          this.data = parsed;
        }

        logger.debug(`Loaded ${this.data.issues.length} known issues from storage`);
      }
    } catch (e) {
      logger.warn('Failed to load known issues file:', e);
      this.data = { issues: [] };
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(config.knownIssuesFile, JSON.stringify(this.data, null, 2), 'utf-8');
      logger.debug('Known issues saved to disk');
    } catch (e) {
      logger.error('Failed to save known issues file:', e);
    }
  }

  getAllIssues(): IssueRecord[] {
    return this.data.issues;
  }

  getIssue(issueId: number): IssueRecord | undefined {
    return this.data.issues.find((issue) => issue.issueId === issueId);
  }

  hasIssue(issueId: number): boolean {
    return this.data.issues.some((issue) => issue.issueId === issueId);
  }

  addIssue(record: IssueRecord): void {
    if (!this.hasIssue(record.issueId)) {
      this.data.issues.push(record);
      this.save();
      logger.info(`Added issue ${record.issueId} to storage`);
    }
  }

  updateIssue(issueId: number, updates: Partial<IssueRecord>): void {
    const index = this.data.issues.findIndex((issue) => issue.issueId === issueId);
    if (index !== -1) {
      this.data.issues[index] = { ...this.data.issues[index], ...updates };
      this.save();
      logger.debug(`Updated issue ${issueId} in storage`);
    }
  }

  removeIssue(issueId: number): IssueRecord | undefined {
    const index = this.data.issues.findIndex((issue) => issue.issueId === issueId);
    if (index !== -1) {
      const removed = this.data.issues.splice(index, 1)[0];
      this.save();
      logger.info(`Removed issue ${issueId} from storage`);
      return removed;
    }
    return undefined;
  }

  getIssueIds(): Set<number> {
    return new Set(this.data.issues.map((issue) => issue.issueId));
  }
}
