const { App } = require('@slack/bolt');
const { Logger, LogLevel } = require('./classes/Logger.js');
const { HelloSlashCommandExport } = require('./commands/Hello.js');
const { DearDiaryCommandExport } = require('./commands/DearDiary.js');
require("dotenv").config();
// LogLevel enum values:
// DEBUG = 0  (Most verbose, shows everything)
// INFO = 1   (Shows info and above)
// WARN = 2   (Shows warnings and errors)
// ERROR = 3  (Shows only errors)
// NONE = 4   (Disables logging)
class SlackApplication {
  constructor() {
    this.logger = new Logger({
      logLevel: LogLevel.DEBUG,
      maxFileSize: 5 * 1024 * 1024, // This means 5mb because 1kb = 1024 bytes and 1mb = 1024kb and add them together to get 5mb.
      maxFiles: 3,
      logFile: 'slack-app-log.log'
    });

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN
    });
  }

  async start() {
    await this.app.start();
    this.logger.info("<r>Red text</> normal text");
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM')); 


    try { 
      await this.app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_LOGGING_CHANNEL_ID, 
        text: 'The Storyteller Slack Application is now online.',
        blocks: [{
          "type": "header",
          "text": {
            "type": "plain_text", 
            "text": `🟢 APPLICATION ONLINE - ${new Date().toLocaleString()}`,
            "emoji": true
          }
        }]
      });
    } catch (error) {
      Logger.error("Error sending online message:", error);
    }
  }
  async shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    try {
      await this.app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_ID,
        text: 'The Storyteller Slack Application is now offline.',
        blocks: [{
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": `🔴 APPLICATION OFFLINE - ${new Date().toLocaleString()}`,
            "emoji": true
          }
        }]
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
      [HelloSlashCommandExport.command]: {
        handler: HelloSlashCommandExport.execute.bind(HelloSlashCommandExport),
        private: HelloSlashCommandExport.private,
        privateDenyMessage: HelloSlashCommandExport.privateDenyMessage
      },
      [DearDiaryCommandExport.command]: {
        handler: DearDiaryCommandExport.execute.bind(DearDiaryCommandExport),
        private: DearDiaryCommandExport.private,
        privateDenyMessage: DearDiaryCommandExport.privateDenyMessage
      }
    };
  }

  registerCommands() {
    for (const [command, config] of Object.entries(this.commands)) {
      this.app.command(command, async ({ command, ack, respond, client }) => {
        try {
          if ((config.private && command.user_id !== process.env.SLACK_USER_ID)) {
            await ack();
            await respond({
              text: `${config.privateDenyMessage}`,
              response_type: 'ephemeral'
            });
            return;
          }

          await config.handler({ command, ack, respond, client }); 
        } catch (error) {
          console.error(`Error handling command ${command}:`, error);
          await respond({
            text: 'Sorry, there was an error processing your command.',
            response_type: 'ephemeral'
          });
        }
      });
    }
    console.log('Commands registered successfully!');
  }
}

async function initializeApp() {
  try {
    const slackApp = new SlackApplication();
    await slackApp.start();
    
    const commandHandler = new CommandHandler(slackApp.app);
    commandHandler.registerCommands();
  } catch (error) {
    console.error('Error initializing app:', error);
    process.exit(1);
  }
}

(async () => {
  await initializeApp();
})();