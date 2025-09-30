# Redmine Issue Watcher

This Node.js script periodically checks your Redmine instance for new issues assigned to you and triggers a webhook if new issues are found.

## Usage

1. Copy `.env.example` to `.env` and fill in your Redmine API details and webhook URL.
2. Build the Docker image:
   ```sh
   docker build -t redmine-issue-watcher .
   ```
3. Run the container:
   ```sh
   docker run --env-file .env redmine-issue-watcher
   ```

## Environment Variables
- `REDMINE_API_KEY`: Your Redmine API key
- `REDMINE_URL`: Base URL of your Redmine instance (e.g., https://redmine.example.com)
- `WEBHOOK_URL`: The webhook to call when new issues are found
- `CRON_SCHEDULE`: (Optional) Cron schedule string (default: every 5 minutes)
