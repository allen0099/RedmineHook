import { config, validateConfig } from './config';
import { Scheduler } from './scheduler';
import { logger } from './logger';

// 主要啟動函式
async function main() {
  // 驗證配置
  try {
    validateConfig();
  } catch (error: any) {
    logger.error('Configuration error:', error.message);
    process.exit(1);
  }

  // 建立並啟動排程器
  const scheduler = new Scheduler();
  await scheduler.start();

  // 處理程序終止信號
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
}

// 執行主程式
main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
