# 快速參考指南

## 常用命令

```bash
# 安裝依賴
pnpm install

# 開發模式運行
pnpm dev

# 建置專案
pnpm build

# 運行建置後的版本
pnpm start
```

## 環境變數快速設定

```bash
# 必要變數
REDMINE_API_KEY=your_key
REDMINE_URL=https://your-redmine.com
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_PRIVATE_TOKEN=your_token

# 可選變數
WEBHOOK_URL=https://your-webhook.com
CRON_SCHEDULE=*/5 * * * *
DEBUG=false
```

## 檔案結構

```
RedmineHook/
├── src/                    # 原始碼目錄
│   ├── config.ts          # 配置管理
│   ├── logger.ts          # 日誌系統
│   ├── types.ts           # 型別定義
│   ├── storage.ts         # 持久化存儲
│   ├── redmine.ts         # Redmine 服務
│   ├── gitlab.ts          # GitLab 服務
│   ├── issueHandler.ts    # Issue 處理邏輯
│   ├── scheduler.ts       # 排程器
│   └── index.ts           # 入口點
├── dist/                   # 編譯輸出目錄
├── known_issues.json       # 資料存儲
├── .env                    # 環境變數（不提交到版本控制）
├── .env.example            # 環境變數範本
├── README.md               # 主要文件
├── ARCHITECTURE.md         # 架構說明
├── MIGRATION.md            # 遷移指南
└── package.json            # 專案設定
```

## 主要功能流程

### 1. 新 Issue 處理
```
Redmine 發現新 issue → 搜尋 GitLab 專案 → 建立 Trigger → 觸發 Pipeline → 存儲記錄
```

### 2. Issue 移除處理
```
Redmine issue 消失 → 取得存儲記錄 → 刪除 GitLab Trigger → 清理存儲
```

## API 端點參考

### Redmine API
- `GET /issues.json?assigned_to_id=me&status_id=open` - 取得分配的 issues

### GitLab API
- `GET /projects?search=<name>` - 搜尋專案
- `POST /projects/:id/triggers` - 建立 trigger
- `DELETE /projects/:id/triggers/:trigger_id` - 刪除 trigger
- `POST /projects/:id/trigger/pipeline` - 觸發 pipeline

## 日誌級別

- `INFO` - 正常操作訊息
- `WARN` - 警告（不影響執行）
- `ERROR` - 錯誤（可能影響部分功能）
- `DEBUG` - 詳細除錯資訊（需設定 DEBUG=true）

## 常見問題快速解決

### 找不到 GitLab 專案
- 檢查 Redmine 專案名稱與 GitLab 專案名稱是否匹配
- 確認 token 有權限存取該專案

### Pipeline 觸發失敗
- 確認 GitLab 專案有 `.gitlab-ci.yml`
- 檢查 default branch 設定

### 無法刪除 Trigger
- 確認 token 有 `api` 權限
- 檢查 trigger ID 是否正確

### 資料檔案損壞
- 使用備份還原：`cp known_issues.json.backup known_issues.json`
- 或刪除檔案讓系統重新建立：`rm known_issues.json`

## 除錯技巧

```bash
# 啟用除錯模式
DEBUG=true pnpm dev

# 查看詳細日誌
tail -f s.log

# 檢查資料檔案
cat known_issues.json | jq
```

## Docker 快速指令

```bash
# 建置映像
docker build -t redmine-watcher .

# 運行容器
docker run --env-file .env redmine-watcher

# 背景運行
docker run -d --name redmine-watcher --env-file .env redmine-watcher

# 查看日誌
docker logs -f redmine-watcher

# 停止容器
docker stop redmine-watcher
```

## 建議的 Cron 排程

```bash
# 每 5 分鐘（預設）
*/5 * * * *

# 每 10 分鐘
*/10 * * * *

# 每小時
0 * * * *

# 每天早上 9 點
0 9 * * *

# 工作日每 15 分鐘
*/15 * * * 1-5
```

## GitLab Token 權限檢查清單

創建 Personal Access Token 時需要勾選：
- ✅ `api` - 完整 API 存取
- ✅ `write_repository` - 寫入權限

## 資料備份建議

```bash
# 備份資料檔案
cp known_issues.json known_issues.json.$(date +%Y%m%d_%H%M%S)

# 定期備份（加入 crontab）
0 0 * * * cp /path/to/known_issues.json /path/to/backups/known_issues.json.$(date +\%Y\%m\%d)
```

## 監控建議

監控以下內容：
1. 應用程式是否正常運行
2. 日誌中是否有頻繁的錯誤
3. `known_issues.json` 檔案大小（異常增長可能表示問題）
4. Redmine API 回應時間
5. GitLab API 回應時間

## 效能調整

```bash
# 減少檢查頻率（節省 API 配額）
CRON_SCHEDULE="*/15 * * * *"  # 每 15 分鐘

# 增加檢查頻率（更即時）
CRON_SCHEDULE="*/2 * * * *"   # 每 2 分鐘
```

## 獲取幫助

1. 查看 `README.md` - 完整使用說明
2. 查看 `ARCHITECTURE.md` - 架構與設計細節
3. 查看 `MIGRATION.md` - 版本升級指南
4. 啟用 DEBUG 模式查看詳細日誌
5. 檢查 GitHub Issues
