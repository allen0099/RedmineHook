export interface RedmineIssue {
  id: number;
  subject: string;
  description?: string;
  project: {
    id: number;
    name: string;
  };
  status: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
}

export interface RedmineIssueStatus {
  id: number;
  name: string;
}

export interface StatusCache {
  statuses: RedmineIssueStatus[];
  inProgressId: number | null;
  lastFetched: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  default_branch: string;
}

export interface PipelineTrigger {
  id: number;
  description: string;
  token: string;
  created_at: string;
}

export interface IssueRecord {
  issueId: number;
  projectName: string;
  gitlabProjectId?: number;
  gitlabProjectPath?: string;
  triggerId?: number;
  triggerToken?: string;
  createdAt: string;
}

export interface KnownIssuesData {
  issues: IssueRecord[];
}
