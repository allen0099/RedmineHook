# 架構文件

## 系統架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                            │
│                    (應用程式入口點)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      scheduler.ts                           │
│              (排程器 - 協調所有組件)                          │
└──┬────────────┬────────────┬────────────┬───────────────────┘
   │            │            │            │
   ▼            ▼            ▼            ▼
┌──────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐
│Storage│  │ Redmine  │  │ GitLab  │  │ IssueHandler │
│      │  │ Service  │  │ Service │  │              │
└──────┘  └──────────┘  └─────────┘  └──────────────┘
   │
   ▼
┌─────────────────┐
│known_issues.json│
│  (持久化存儲)    │
└─────────────────┘
```

## 模組說明

### 1. `config.ts` - 配置管理

**職責**：
- 載入並驗證環境變數
- 提供統一的配置介面
- 在應用程式啟動時檢查必要的配置項

**主要功能**：
- `validateConfig()`: 驗證所有必要的環境變數是否存在
- 提供型別安全的配置物件

### 2. `logger.ts` - 日誌系統

**職責**：
- 提供統一的日誌介面
- 格式化日誌輸出
- 支援不同的日誌級別

**日誌級別**：
- `info`: 一般資訊
- `warn`: 警告訊息
- `error`: 錯誤訊息
- `debug`: 除錯訊息（需啟用 DEBUG 模式）

### 3. `types.ts` - 型別定義

**職責**：
- 定義所有介面和型別
- 確保型別安全

**主要型別**：
- `RedmineIssue`: Redmine issue 的結構
- `GitLabProject`: GitLab 專案的結構
- `PipelineTrigger`: Pipeline trigger 的結構
- `IssueRecord`: 持久化存儲的 issue 記錄結構
- `KnownIssuesData`: 存儲檔案的整體結構

### 4. `storage.ts` - 持久化存儲

**職責**：
- 管理 `known_issues.json` 檔案
- 提供 CRUD 操作介面
- 處理資料遷移（從舊格式到新格式）

**主要方法**：
- `getAllIssues()`: 取得所有 issues
- `getIssue(id)`: 取得特定 issue
- `hasIssue(id)`: 檢查 issue 是否存在
- `addIssue(record)`: 新增 issue
- `updateIssue(id, updates)`: 更新 issue
- `removeIssue(id)`: 移除 issue
- `getIssueIds()`: 取得所有 issue IDs

### 5. `redmine.ts` - Redmine 服務

**職責**：
- 與 Redmine API 互動
- 取得分配的 issues
- 發送 webhook 通知

**主要方法**：
- `fetchAssignedIssues()`: 從 Redmine 取得分配給當前使用者的開放 issues
- `notifyWebhook(issues)`: 發送 webhook 通知

**API 端點**：
- `GET /issues.json?assigned_to_id=me&status_id=open`: 取得分配的 issues

### 6. `gitlab.ts` - GitLab 服務

**職責**：
- 與 GitLab API 互動
- 管理 Pipeline Triggers
- 觸發 Pipelines

**主要方法**：
- `findProjectByName(name)`: 根據名稱搜尋 GitLab 專案
- `createPipelineTrigger(projectId, description)`: 建立 Pipeline Trigger
- `deletePipelineTrigger(projectId, triggerId)`: 刪除 Pipeline Trigger
- `triggerPipeline(projectId, token, ref)`: 觸發 Pipeline

**API 端點**：
- `GET /projects?search=<name>`: 搜尋專案
- `POST /projects/:id/triggers`: 建立 trigger
- `DELETE /projects/:id/triggers/:trigger_id`: 刪除 trigger
- `POST /projects/:id/trigger/pipeline`: 觸發 pipeline

### 7. `issueHandler.ts` - Issue 處理器

**職責**：
- 協調 Redmine、GitLab 和 Storage 服務
- 實作業務邏輯
- 處理新建立和移除的 issues

**主要方法**：
- `handleNewIssue(issue)`: 處理新建立的 issue
  1. 提取專案名稱
  2. 搜尋 GitLab 專案
  3. 建立 Pipeline Trigger
  4. 觸發 Pipeline
  5. 存儲記錄

- `handleRemovedIssue(issueId)`: 處理移除的 issue
  1. 取得存儲的記錄
  2. 刪除 GitLab Pipeline Trigger
  3. 從存儲中移除記錄

- `notifyNewIssues(issues)`: 發送 webhook 通知

### 8. `scheduler.ts` - 排程器

**職責**：
- 初始化所有服務
- 管理定期檢查的排程
- 協調整個檢查流程

**主要方法**：
- `checkForNewIssues()`: 執行檢查流程
  1. 從 Redmine 取得目前的 issues
  2. 比對已知的 issues
  3. 處理新的 issues
  4. 處理移除的 issues
  
- `start()`: 啟動排程器
- `stop()`: 停止排程器

**工作流程**：
```
┌─────────────────┐
│  啟動排程器      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  立即執行檢查    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 根據 CRON_SCHEDULE      │
│ 定期執行檢查             │
└────────┬────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ checkForNewIssues()                │
│ 1. 取得 Redmine issues             │
│ 2. 找出新 issues                   │
│ 3. 處理每個新 issue                │
│    - 搜尋 GitLab 專案              │
│    - 建立 trigger                  │
│    - 觸發 pipeline                 │
│ 4. 找出移除的 issues               │
│ 5. 處理每個移除的 issue            │
│    - 刪除 trigger                  │
│    - 清理存儲                      │
└────────────────────────────────────┘
```

### 9. `index.ts` - 應用程式入口

**職責**：
- 驗證配置
- 初始化排程器
- 處理程序信號（SIGINT, SIGTERM）

## 資料流程

### 新 Issue 的處理流程

```
Redmine API
    │
    ▼
fetchAssignedIssues()
    │
    ▼
比對 Storage 中的 known issues
    │
    ▼
發現新 issue
    │
    ├─────────────────────────┐
    │                         │
    ▼                         ▼
handleNewIssue()        notifyWebhook()
    │                         │
    ▼                         │
findProjectByName()           │
    │                         │
    ▼                         │
createPipelineTrigger()       │
    │                         │
    ▼                         │
triggerPipeline()             │
    │                         │
    ▼                         │
storage.addIssue()            │
    │                         │
    └──────────┬──────────────┘
               ▼
          完成處理
```

### 移除 Issue 的處理流程

```
Redmine API
    │
    ▼
fetchAssignedIssues()
    │
    ▼
比對 Storage 中的 known issues
    │
    ▼
發現 issue 已不存在
    │
    ▼
handleRemovedIssue()
    │
    ▼
storage.getIssue()
    │
    ▼
deletePipelineTrigger()
    │
    ▼
storage.removeIssue()
    │
    ▼
完成清理
```

## 錯誤處理策略

1. **API 呼叫失敗**：記錄錯誤但繼續執行，不中斷整個流程
2. **儲存失敗**：記錄錯誤，下次檢查時會重試
3. **配置錯誤**：應用程式啟動時立即終止
4. **部分失敗**：繼續處理其他 issues，記錄失敗的項目

## 擴展性考量

### 新增其他 CI/CD 平台

可以參考 `gitlab.ts` 的結構，建立新的服務模組（如 `jenkins.ts`、`github.ts`），並在 `issueHandler.ts` 中整合。

### 新增其他專案管理系統

可以參考 `redmine.ts` 的結構，建立新的服務模組（如 `jira.ts`），並更新 `scheduler.ts` 的初始化邏輯。

### 新增通知渠道

可以在 `issueHandler.ts` 或 `redmine.ts` 中新增方法，支援 Slack、Email 等通知方式。

## 測試建議

### 單元測試

- 為每個服務模組編寫單元測試
- Mock 外部 API 呼叫
- 測試錯誤處理邏輯

### 整合測試

- 測試完整的工作流程
- 使用測試用的 Redmine 和 GitLab 實例
- 驗證持久化存儲的正確性

### E2E 測試

- 模擬真實的使用場景
- 驗證從 issue 建立到 pipeline 觸發的完整流程
- 測試清理機制

## 效能考量

1. **API 請求頻率**：由 `CRON_SCHEDULE` 控制，預設為 5 分鐘
2. **批次處理**：新 issues 和移除的 issues 都以批次方式處理
3. **錯誤重試**：目前不實作自動重試，依賴下次排程執行
4. **記憶體使用**：所有已知 issues 載入到記憶體中，適用於中小型專案

## 安全性考量

1. **敏感資訊**：API keys 和 tokens 透過環境變數管理
2. **存儲安全**：`known_issues.json` 不包含敏感資訊
3. **API 權限**：使用最小權限原則配置 API tokens
4. **日誌安全**：避免在日誌中輸出敏感資訊
