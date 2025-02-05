const fs = require('fs').promises;
const { Logger, LogLevel } = require('../classes/Logger.js');
const logger = new Logger({
  logLevel: LogLevel.INFO,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 3,
  logFile: "slack-app-log.log",
});
const path = require('path');
require("dotenv").config();
const DearDiaryCommandExport = {
    command: `/deardiary`,
    private: true,
    privateDenyMessage: `You are not the speaker of this story, sorry.`,
    async execute({ command, client, ack, respond }) {
        try {
            await ack();
            logger.info(`Acknowledged /deardiary command.`);

            const queueDir = path.join(__dirname, `../../data/queue`);
            const files = await fs.readdir(queueDir);
            logger.info(`Read files from queue directory: ${queueDir}`);
            const pendingFiles = files.filter(f => f.startsWith(`queued-`));
            logger.info(`Filtered pending files: ${pendingFiles}`);

            if (pendingFiles.length === 0) {
                await respond({
                    text: `The diary queue is empty.`,
                    response_type: `ephemeral`,
                });
                logger.info(`Diary queue is empty.`);
                return;
            }

            pendingFiles.sort();
            const oldestFile = pendingFiles[0];
            const filePath = path.join(queueDir, oldestFile);
            const data = JSON.parse(await fs.readFile(filePath, `utf8`));
            logger.info(`Loaded data from oldest file: ${filePath}`);

            try {
                await client.chat.postMessage({
                    channel: process.env.SLACK_DIARY_CHANNEL_ID,
                    blocks: data.blocks,
                });
                logger.info(`Posted message to Slack channel: ${process.env.SLACK_DIARY_CHANNEL_ID}`);

                await fs.rename(
                    filePath,
                    path.join(__dirname, `../../data/sent`, `sent-${Date.now()}.json`)
                );
                logger.info(`Moved file to sent folder: ${filePath}`);

                await respond({
                    text: `Diary entry sent!`,
                    response_type: `ephemeral`,
                });
                logger.info(`Responded with success message.`);
            } catch (error) {
                logger.error(`Error sending diary entry: ${error}`);
                await respond({
                    text: `Failed to post diary entry: ${error.message}`,
                    response_type: `ephemeral`,
                });
            }
        } catch (error) {
            logger.error(`Error handling /deardiary command: ${error}`);
            await respond({
                text: `Sorry, there was an error processing your command.`,
                response_type: `ephemeral`,
            });
        } finally {
            logger.info(`/deardiary command processing completed.`);
        }
    },
};

module.exports = { DearDiaryCommandExport };