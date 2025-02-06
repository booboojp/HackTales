const fs = require('fs').promises;
const path = require('path');
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});

const SendMostRecentCommandExport = {
  command: `/sendmostrecent`,
  private: true,
  privateDenyMessage: `You are not the speaker of this story, sorry.`,
  async execute({ command, client, ack, respond }) {
    try {
      await ack();
      logger.info(`Acknowledged /sendMostRecent command.`);

      const queueDir = path.join(__dirname, `../../data/queue`);
      const files = await fs.readdir(queueDir);
      const pendingFiles = files.filter(f => f.startsWith(`queued-`));

      if (pendingFiles.length === 0) {
        await respond({ text: `The diary queue is empty.`, response_type: `ephemeral` });
        logger.info(`Diary queue is empty.`);
        return;
      }

      pendingFiles.sort();
      const mostRecentFile = pendingFiles[pendingFiles.length - 1];
      const filePath = path.join(queueDir, mostRecentFile);
      const data = JSON.parse(await fs.readFile(filePath, `utf8`));

      await client.chat.postMessage({
        channel: process.env.SLACK_DIARY_CHANNEL_ID,
        blocks: data.blocks,
      });

      await fs.rename(filePath, path.join(__dirname, `../../data/sent`, `sent-${Date.now()}.json`));
      await respond({ text: `Most recent diary entry sent!`, response_type: `ephemeral` });
      logger.info(`Sent most recent diary entry.`);
    } catch (error) {
      logger.error(`Error handling /sendMostRecent command: ${error}`);
      await respond({ text: `Sorry, there was an error processing your command.`, response_type: `ephemeral` });
    }
  },
};

module.exports = { SendMostRecentCommandExport };