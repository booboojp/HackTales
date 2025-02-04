const { App } = require("@slack/bolt");
require("dotenv").config();





const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});



app.command('/hello', async ({ command, ack, say }) => {
    await ack();

    await respond(`Hi there, <@${command.user_id}>!`);
});



(async () => {
  const port = 3000;
  await app.start(process.env.PORT || port);
  console.log('Bolt app started!!');

  try {
    await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: process.env.SLACK_USER_ID,
      text: "Hello, the app has started successfully!"
    });
    console.log("Message sent successfully!");
  } catch (error) {
    console.error("Error sending message:", error);
  }
})();