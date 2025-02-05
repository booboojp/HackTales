const { App } = require("@slack/bolt");
const { Logger, LogLevel } = require("./classes/Logger.js");
const { DearDiaryCommandExport } = require("./commands/DearDiary.js");
const {
  CreateChannelCommandExport,
  DeleteChannelCommandExport,
  ListChannelsCommandExport,
} = require("./commands/ChannelCommands.js");
require("dotenv").config();

const BOT_NAME = 'The Storyteller'



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
		await this.logger.infoTypewriter(`Booting up Application...`, 100, 1000, 1000, true, false);	
		await this.logger.errorTypewriter(`Hackclub User Detected! Starting program!`, 100, 1000, 2000, true, true);
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
      [CreateChannelCommandExport.command]: {
        handler: CreateChannelCommandExport.execute.bind(
          CreateChannelCommandExport
        ),
        private: CreateChannelCommandExport.private,
        privateDenyMessage: CreateChannelCommandExport.privateDenyMessage,
      },
      [DeleteChannelCommandExport.command]: {
        handler: DeleteChannelCommandExport.execute.bind(
          DeleteChannelCommandExport
        ),
        private: DeleteChannelCommandExport.private,
        privateDenyMessage: DeleteChannelCommandExport.privateDenyMessage,
      },
      [ListChannelsCommandExport.command]: {
        handler: ListChannelsCommandExport.execute.bind(
          ListChannelsCommandExport
        ),
        private: ListChannelsCommandExport.private,
        privateDenyMessage: ListChannelsCommandExport.privateDenyMessage,
      },
    };
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
