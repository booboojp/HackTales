const fs = require('fs').promises;
const path = require('path');
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});

const DeleteFromQueueCommandExport = {
  command: `/deletefromqueue`,
  private: true,
  privateDenyMessage: `You are not the speaker of this story, sorry.`,
  async execute({ command, client, ack, respond }) {
    try {
      await ack();
      logger.info(`Acknowledged /deleteFromQueue command.`);

      const queueDir = path.join(__dirname, `../../data/queue`);
      const files = await fs.readdir(queueDir);
      const pendingFiles = files.filter(f => f.startsWith(`queued-`));

      if (pendingFiles.length === 0) {
        await respond({ text: `The diary queue is empty.`, response_type: `ephemeral` });
        logger.info(`Diary queue is empty.`);
        return;
      }

      const fileNameToDelete = command.text.trim();
      const filePath = path.join(queueDir, fileNameToDelete);

      if (!pendingFiles.includes(fileNameToDelete)) {
        await respond({ text: `File not found in the queue.`, response_type: `ephemeral` });
        logger.info(`File not found: ${fileNameToDelete}`);
        return;
      }

      await fs.unlink(filePath);
      await respond({ text: `File ${fileNameToDelete} deleted from the queue.`, response_type: `ephemeral` });
      logger.info(`Deleted file from queue: ${fileNameToDelete}`);
    } catch (error) {
      logger.error(`Error handling /deleteFromQueue command: ${error}`);
      await respond({ text: `Sorry, there was an error processing your command.`, response_type: `ephemeral` });
    }
  },
};

module.exports = { DeleteFromQueueCommandExport };