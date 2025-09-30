# Redmine Issue Watcher with GitLab Integration

這個 Node.js 腳本會定期檢查您的 Redmine 實例中分配給您的新 issues，並自動在 GitLab 中建立 Pipeline Triggers 來觸發相應專案的 CI/CD 流程。

## 功能特色

- 🔄 **自動監控**：定期檢查 Redmine 中新分配的 issues
- 🚀 **GitLab 整合**：自動搜尋對應的 GitLab 專案並建立 Pipeline Trigger
- 🎯 **自動觸發**：當新 issue 被建立時，自動觸發對應專案的 Pipeline
- 🧹 **自動清理**：當 issue 被移除時，自動刪除對應的 Pipeline Trigger
- 📦 **持久化存儲**：保存 issue 與 GitLab trigger 的映射關係
- 🔔 **Webhook 通知**：可選的 webhook 通知功能
- 📝 **完整日誌**：詳細的操作日誌記錄

## 架構說明

專案採用模組化設計，主要模組包括：

- `config.ts` - 配置管理與驗證
- `logger.ts` - 日誌系統
- `types.ts` - TypeScript 型別定義
- `storage.ts` - 持久化存儲管理
- `redmine.ts` - Redmine API 服務
- `gitlab.ts` - GitLab API 服務
- `issueHandler.ts` - Issue 處理邏輯
- `scheduler.ts` - 排程器
- `index.ts` - 應用程式入口

## 環境變數

### 必要變數

- `REDMINE_API_KEY`: Redmine API 金鑰
- `REDMINE_URL`: Redmine 實例的基礎 URL（例如：https://redmine.example.com）
- `GITLAB_API_URL`: GitLab API 的 URL（例如：https://gitlab.com/api/v4）
- `GITLAB_PRIVATE_TOKEN`: GitLab 私人存取令牌（需要 `api` 和 `write_repository` 權限）

### 可選變數

- `WEBHOOK_URL`: 當發現新 issues 時要呼叫的 webhook URL
- `CRON_SCHEDULE`: Cron 排程字串（預設：`*/5 * * * *` 每 5 分鐘）
- `DEBUG`: 設定為 `true` 以啟用除錯日誌（預設：`false`）

## 安裝與使用

### 本地開發

1. 複製環境變數範本並填入您的設定：
   ```sh
   cp .env.example .env
   ```

2. 安裝相依套件：
   ```sh
   pnpm install
   ```

3. 開發模式執行：
   ```sh
   pnpm dev
   ```

4. 建置專案：
   ```sh
   pnpm build
   ```

5. 執行建置後的版本：
   ```sh
   pnpm start
   ```

### Docker 部署

1. 建置 Docker 映像：
   ```sh
   docker build -t redmine-issue-watcher .
   ```

2. 執行容器：
   ```sh
   docker run --env-file .env redmine-issue-watcher
   ```

## 工作流程

1. **監控新 Issues**：
   - 腳本定期從 Redmine 獲取分配給您的開放 issues
   - 比對已知的 issues 列表，找出新建立的 issues

2. **建立 Pipeline Trigger**：
   - 對於每個新 issue，提取其專案名稱
   - 在 GitLab 中搜尋對應的專案
   - 如果找到匹配的專案，建立一個新的 Pipeline Trigger
   - 使用生成的 trigger token 觸發專案的 default branch 上的 pipeline

3. **持久化存儲**：
   - 將 issue ID、專案資訊、GitLab 專案 ID、trigger ID 和 token 存儲在 `known_issues.json`
   - 支援從舊格式（純 issue ID 陣列）自動遷移到新格式

4. **清理機制**：
   - 當 issue 不再出現在 Redmine 的分配列表中時（被關閉或取消分配）
   - 自動從 GitLab 專案中刪除對應的 Pipeline Trigger
   - 從持久化存儲中移除該 issue 的記錄

5. **Webhook 通知**（可選）：
   - 當發現新 issues 時，可以呼叫指定的 webhook URL
   - 發送包含新 issues 資訊的 POST 請求

## GitLab Token 權限需求

您的 GitLab Private Token 需要以下權限：
- `api` - 完整的 API 存取權限
- `write_repository` - 寫入 repository 的權限（用於建立 triggers）

您可以在 GitLab 的 **User Settings > Access Tokens** 中建立具有這些權限的 token。

## 資料存儲格式

`known_issues.json` 檔案格式：

```json
{
  "issues": [
    {
      "issueId": 12345,
      "projectName": "My Project",
      "gitlabProjectId": 67890,
      "gitlabProjectPath": "group/my-project",
      "triggerId": 42,
      "triggerToken": "glptt-xxxxxxxxxxxxx",
      "createdAt": "2025-09-30T10:30:00.000Z"
    }
  ]
}
```

## 日誌說明

腳本會輸出以下級別的日誌：
- `INFO` - 一般資訊訊息
- `WARN` - 警告訊息
- `ERROR` - 錯誤訊息
- `DEBUG` - 除錯訊息（需設定 `DEBUG=true`）

## 故障排除

### 找不到 GitLab 專案

如果腳本無法找到對應的 GitLab 專案，請確認：
- Redmine 專案名稱與 GitLab 專案名稱或路徑是否相符
- 您的 GitLab token 是否有權限存取該專案
- 專案是否在您的 GitLab token 有權限的群組或命名空間中

### Pipeline 觸發失敗

如果 Pipeline 觸發失敗，請檢查：
- GitLab 專案是否有設定 CI/CD 配置（`.gitlab-ci.yml`）
- Default branch 名稱是否正確
- Token 權限是否足夠

## 授權

MIT License
