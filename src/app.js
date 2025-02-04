const { App } = require("@slack/bolt");
require("dotenv").config();

class SlackApplication {
  constructor() {
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN
    });
  }

  async start() {
    await this.app.start();
    console.log('⚡️ Bolt app started in socket mode!');

    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM')); 


    try { 
      await this.app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_ID, 
        blocks: [{
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": `🟢 APPLICATION ONLINE - ${new Date().toLocaleString()}`,
            "emoji": true
          }
        }]
      });
      console.log("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
  async shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    try {
      await this.app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_ID,
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
      '/hello': this.handleHello.bind(this)
    };
  }

  registerCommands() {
    for (const [command, handler] of Object.entries(this.commands)) {
      this.app.command(command, handler);
    }
    console.log('Commands registered successfully!');
  }

  async handleHello({ command, ack, respond }) {
    try {
      await ack();
      await respond({
        text: `Hi there, <@${command.user_id}>! 👋`,
        response_type: 'in_channel',
      });
      console.log('Command /hello executed successfully!');
    } catch (error) {
      console.error('Error handling /hello command:', error);
      await respond({
        text: 'Sorry, there was an error processing your command.',
        response_type: 'ephemeral'
      });
    }
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