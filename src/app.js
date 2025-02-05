const { App } = require("@slack/bolt");
const { Logger, LogLevel } = require("./classes/Logger.js");
const { DearDiaryCommandExport } = require("./commands/DearDiary.js");
const { PingSlashCommandExport } = require("./commands/Ping.js");
const fs = require("fs").promises;
const path = require('path');
const QUEUE_DIR = path.join(__dirname, '../data/queue');
require("dotenv").config();



const HACKCLUB_INTRO = false;
const BOT_NAME = 'The Storyteller'



// LogLevel enum values:
// DEBUG = 0  (Most verbose, shows everything)
// INFO = 1   (Shows info and above)
// WARN = 2   (Shows warnings and errors)
// ERROR = 3  (Shows only errors)
// NONE = 4   (Disables logging)





class SlackApplication {
  constructor() {
    if (process.env.DISABLE_QUEUE_PROCESSING !== 'true') {
		setInterval(() => this.processQueue(), 5000);
	  }
    this.logger = new Logger({
      logLevel: LogLevel.DEBUG,
      maxFileSize: 5 * 1024 * 1024,
      maxFiles: 3,
      logFile: "slack-app-log.log",
    });

    this.app = new App({
    token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN,
    });
  }
  async start() {
    try {
    (HACKCLUB_INTRO) ? (await this.logger.infoTypewriter(`Booting up Application...`, 100, 1000, 1000, true, false)) : (null);
    (HACKCLUB_INTRO) ? (await this.logger.errorTypewriter(`Hackclub User Detected! Starting program!`, 100, 1000, 2000, true, true)) : (null);
        try { 
            this.logger.info(`Starting Slack Application: (<m><bold>${BOT_NAME}</></>)`);
              await this.app.start();
        } catch (error) { 
            this.logger.error(`Error Starting Slack Application: (<m><bold>${BOT_NAME}</></>). Error: <bold><r>${error}</></>`);
        } finally { 
            this.logger.info(`Successfully Started Slack Application: (<m><bold>${BOT_NAME}</></>)`); 
        }
    
        try {
            this.logger.info("Setting up shutdown handlers...");
            process.on("SIGINT", () => this.shutdown("SIGINT"));
            process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        } catch (error) {
            this.logger.error(`Error Setting up Shutdown Handlers: ${error}`);
        } finally {
            this.logger.info("Shutdown handlers set up successfully!");
        }
    
        try {
          await this.app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: process.env.SLACK_LOGGING_CHANNEL_ID,
            text: "The Storyteller Slack Application is now online.",
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: `🟢 APPLICATION ONLINE - ${new Date().toLocaleString()}`,
                  emoji: true,
                },
              },
            ],
          });
        } catch (error) {
          Logger.error("Error sending online message:", error);
        }
    } catch (error) {

    } finally {

    }
  }


	async processQueue() {
		try {
			await fs.mkdir(QUEUE_DIR, { recursive: true });
			const files = await fs.readdir(QUEUE_DIR);
			const logFiles = files.map(file => file.length > 4 ? `${file.slice(0, 4)}...` : file);
			const displayedFiles = logFiles.slice(0, 5);
			this.logger.info(`Files in queue: ${displayedFiles.join(', ')}${logFiles.length > 5 ? ' x5' : ''}`);
			const pendingFiles = files.filter(f => f.startsWith('queued-'));

			for (const file of pendingFiles) {
				const filePath = path.join(QUEUE_DIR, file);
				const lockFilePath = `${filePath}.lock`; // No more changes ^W^

				try {
					await fs.writeFile(lockFilePath, '', { flag: 'wx' }); 
				} catch (lockError) {
					this.logger.warn(`Could not acquire lock for ${file}. Skipping.`);
					continue; // Moving onn! Last stop! Tokyo!
				}

				try {
					let data = JSON.parse(await fs.readFile(filePath, 'utf8'));
					await this.logger.info(`Processing <b>${file}</> : <b>${data.status}</> : <b>${data.retries || 0}</> retries`);
					if (data.status === 'pending' || (data.status === 'failed' && (data.retries || 0) < 3)) {
						try {
							await this.app.client.chat.postMessage({
								channel: process.env.SLACK_DIARY_CHANNEL_ID,
								blocks: data.blocks
							});

							if (await this.fileExists(filePath)) {
								await this.safeRename(filePath, path.join(__dirname, '../data/sent', `sent-${Date.now()}.json`));
							} else {
								this.logger.warn(`File ${file} disappeared before rename.`);
							}

						} catch (error) {
							data.status = 'failed';
							data.error = error.message;
							data.retries = (data.retries || 0) + 1;
							await fs.writeFile(filePath, JSON.stringify(data));
							this.logger.error(`Failed to process ${file}: ${error.message}`); 
						}
					} else if (data.status === 'failed' && (data.retries || 0) >= 3) {
						this.logger.warn(`Message ${file} failed after 3 retries.  Skipping.`);
					}
				} finally {
          // *unlocks your handcufs* Daddy?
					await fs.unlink(lockFilePath);
				}
			}
		} catch (error) {
			console.error('Queue processing error:', error);
		}
	}

	async safeRename(oldPath, newPath, retries = 3) {
		try {
			await fs.rename(oldPath, newPath);
		} catch (err) {
			this.logger.error(`Rename attempt failed for ${oldPath} after ${3 - retries} retries: ${err.message}`);
			if (retries > 0) {
				console.warn(`Rename failed, retrying... (${retries} retries remaining)`);
				await new Promise(resolve => setTimeout(resolve, 1000)); 
				await this.safeRename(oldPath, newPath, retries - 1);
			} else {
				throw err;
			}
		}
	}

	async fileExists(filePath, retries = 3) {
		try {
			await fs.access(filePath);
			return true;
		} catch (e) {
			if (retries > 0) {
				this.logger.warn(`File ${filePath} not found. Retrying... (${retries} retries remaining)`);
				await new Promise(resolve => setTimeout(resolve, 100)); 
				return this.fileExists(filePath, retries - 1); 
			}
			this.logger.error(`File ${filePath} not found after ${3 - retries} retries.`);
			return false;
		}
	}

  async shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    try {
      await this.app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_ID,
        text: "The Storyteller Slack Application is now offline.",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🔴 APPLICATION OFFLINE - ${new Date().toLocaleString()}`,
              emoji: true,
            },
          },
        ],
      });
      console.log("Offline message sent successfully!");
    } catch (error) {
      console.error("Error sending offline message:", error);
    }

    await this.app.stop();
    process.exit(0);
  }
}

class CommandHandler {
  constructor(app) {
    this.app = app;
    this.commands = {
      [DearDiaryCommandExport.command]: {
        handler: DearDiaryCommandExport.execute.bind(DearDiaryCommandExport),
        private: DearDiaryCommandExport.private,
        privateDenyMessage: DearDiaryCommandExport.privateDenyMessage,
      },
      [PingSlashCommandExport.command]: {
        handler: PingSlashCommandExport.execute.bind(PingSlashCommandExport),
        private: PingSlashCommandExport.private,
        privateDenyMessage: PingSlashCommandExport.privateDenyMessage,
    }};
  }

  registerCommands() {
    for (const [command, config] of Object.entries(this.commands)) {
      this.app.command(command, async ({ command, ack, respond, client }) => {
        try {
          if (config.private && command.user_id !== process.env.SLACK_USER_ID) {
            await ack();
            await respond({
              text: `${config.privateDenyMessage}`,
              response_type: "ephemeral",
            });
            return;
          }

          await config.handler({ command, ack, respond, client });
        } catch (error) {
          console.error(`Error handling command ${command}:`, error);
          await respond({
            text: "Sorry, there was an error processing your command.",
            response_type: "ephemeral",
          });
        }
      });
    }
    console.log("Commands registered successfully!");
  }
}

async function initializeApp() {
  try {
    const slackApp = new SlackApplication();
    await slackApp.start();

    const commandHandler = new CommandHandler(slackApp.app);
    commandHandler.registerCommands();
  } catch (error) {
    console.error("Error initializing app:", error);
    process.exit(1);
  }
}

(async () => {
  await initializeApp();
})();