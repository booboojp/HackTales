const fs = require('fs').promises;
const path = require('path');
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});

const ViewQueueCommandExport = {
  command: `/viewqueue`,
  private: true,
  privateDenyMessage: `You are not the speaker of this story, sorry.`,
  async execute({ command, client, ack, respond }) {
    try {
      await ack();
      logger.info(`Acknowledged /viewQueue command.`);

      const queueDir = path.join(__dirname, `../../data/queue`);
      const files = await fs.readdir(queueDir);
      const pendingFiles = files.filter(f => f.startsWith(`queued-`));

      if (pendingFiles.length === 0) {
        await respond({ text: `The diary queue is empty.`, response_type: `ephemeral` });
        logger.info(`Diary queue is empty.`);
        return;
      }

      const fileList = pendingFiles.join('\n');
      await respond({ text: `Current queue:\n${fileList}`, response_type: `ephemeral` });
      logger.info(`Responded with current queue.`);
    } catch (error) {
      logger.error(`Error handling /viewQueue command: ${error}`);
      await respond({ text: `Sorry, there was an error processing your command.`, response_type: `ephemeral` });
    }
  },
};

module.exports = { ViewQueueCommandExport };