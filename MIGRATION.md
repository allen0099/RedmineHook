# 遷移指南

## 從舊版本升級到 v2.0

### 主要變更

1. **模組化架構**：代碼已重構為多個模組，提高可維護性
2. **GitLab 整合**：新增自動建立和管理 GitLab Pipeline Triggers 功能
3. **增強的持久化存儲**：`known_issues.json` 格式已更新

### 環境變數變更

新增以下必要的環境變數：

```bash
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_PRIVATE_TOKEN=your_gitlab_private_token
```

新增以下可選的環境變數：

```bash
DEBUG=false
```

### 資料格式遷移

舊版本的 `known_issues.json` 格式：
```json
[12345, 67890]
```

新版本的格式：
```json
{
  "issues": [
    {
      "issueId": 12345,
      "projectName": "My Project",
      "gitlabProjectId": 67890,
      "gitlabProjectPath": "group/my-project",
      "triggerId": 42,
      "triggerToken": "glptt-xxxxx",
      "createdAt": "2025-09-30T10:30:00.000Z"
    }
  ]
}
```

**注意**：應用程式會自動檢測並遷移舊格式的資料檔案。

### 升級步驟

1. **備份現有資料**：
   ```bash
   cp known_issues.json known_issues.json.backup
   ```

2. **更新依賴**（如有需要）：
   ```bash
   pnpm install
   ```

3. **更新環境變數**：
   - 在 `.env` 檔案中新增 `GITLAB_API_URL` 和 `GITLAB_PRIVATE_TOKEN`
   - 參考 `.env.example` 檔案

4. **重新建置**：
   ```bash
   pnpm build
   ```

5. **啟動服務**：
   ```bash
   pnpm start
   ```

### 向後相容性

- 舊的 `known_issues.json` 格式會自動遷移，無需手動處理
- `WEBHOOK_URL` 仍然是可選的，如果不需要 webhook 通知可以留空
- Cron 排程格式保持不變

### 新功能說明

#### GitLab Pipeline Trigger 自動化

當新的 Redmine issue 被建立時：
1. 系統會提取 issue 的專案名稱
2. 在 GitLab 中搜尋對應的專案
3. 如果找到匹配的專案，建立一個新的 Pipeline Trigger
4. 使用生成的 token 觸發該專案的 default branch 上的 pipeline

當 issue 被移除（關閉或取消分配）時：
1. 系統會自動刪除之前建立的 Pipeline Trigger
2. 清理持久化存儲中的相關記錄

### 故障排除

如果遇到問題，請：

1. 啟用除錯模式：設定 `DEBUG=true`
2. 檢查日誌輸出以了解詳細資訊
3. 確認 GitLab Token 有正確的權限（`api` 和 `write_repository`）
4. 確認 Redmine API Key 仍然有效

### 回滾到舊版本

如果需要回滾：

1. 停止新版本服務
2. 恢復備份的 `known_issues.json`：
   ```bash
   cp known_issues.json.backup known_issues.json
   ```
3. 使用舊版本的代碼重新啟動服務

### 取得協助

如有問題，請查看：
- README.md - 完整的使用說明
- 日誌輸出 - 詳細的錯誤資訊
- GitHub Issues - 已知問題和解決方案
