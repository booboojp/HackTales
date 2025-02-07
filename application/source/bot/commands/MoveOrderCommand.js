const fs = require('fs').promises;
const path = require('path');
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});

const MoveOrderCommandExport = {
  command: `/moveorder`,
  private: true,
  privateDenyMessage: `You are not the speaker of this story, sorry.`,
  async execute({ command, client, ack, respond }) {
    try {
      await ack();
      logger.info(`Acknowledged /moveOrder command.`);

      const queueDir = path.join(__dirname, `../../data/queue`);
      const files = await fs.readdir(queueDir);
      const pendingFiles = files.filter(f => f.startsWith(`queued-`));

      if (pendingFiles.length === 0) {
        await respond({ text: `The diary queue is empty.`, response_type: `ephemeral` });
        logger.info(`Diary queue is empty.`);
        return;
      }

      const [firstIndex, secondIndex] = command.text.split(' ').map(Number);
      if (isNaN(firstIndex) || isNaN(secondIndex) || firstIndex < 0 || secondIndex < 0 || firstIndex >= pendingFiles.length || secondIndex >= pendingFiles.length) {
        await respond({ text: `Invalid indices provided.`, response_type: `ephemeral` });
        logger.info(`Invalid indices: ${firstIndex}, ${secondIndex}`);
        return;
      }

      const temp = pendingFiles[firstIndex];
      pendingFiles[firstIndex] = pendingFiles[secondIndex];
      pendingFiles[secondIndex] = temp;

      await respond({ text: `Order of messages swapped between indices ${firstIndex} and ${secondIndex}.`, response_type: `ephemeral` });
      logger.info(`Swapped order of messages: ${firstIndex} <-> ${secondIndex}`);
    } catch (error) {
      logger.error(`Error handling /moveOrder command: ${error}`);
      await respond({ text: `Sorry, there was an error processing your command.`, response_type: `ephemeral` });
    }
  },
};

module.exports = { MoveOrderCommandExport };