require("dotenv").config();

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async addToQueue(item) {
    this.queue.push(item);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { blocks, client, respond } = this.queue.shift();
      try {
        const result = await client.chat.postMessage({
          channel: process.env.SLACK_DIARY_CHANNEL_ID,
          blocks,
          text: "Daily Diary Entry via queued command",
        });
        if (respond) {
          await respond({
            text: `Diary entry queued and sent (ts: ${result.ts})!`,
            response_type: "ephemeral",
          });
        }
      } catch (error) {
        if (respond) {
          await respond({
            text: `Failed to post diary entry: ${error.message}`,
            response_type: "ephemeral",
          });
        }
      }
    }
    this.processing = false;
  }
}

module.exports = new MessageQueue();