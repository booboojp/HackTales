const fs = require('fs').promises;
const path = require('path');
require("dotenv").config();

const DearDiaryCommandExport = {
    command: '/deardiary',
    private: true,
    privateDenyMessage: 'You are not the speaker of this story, sorry.',
    async execute({ command, client, ack, respond }) {
        try {
            await ack();

            const logDir = path.join(__dirname, '../messageLog');
            await fs.mkdir(logDir, { recursive: true });

            const blocksPath = path.join(__dirname, '../data/diary-blocks.json');
            const blocksData = await fs.readFile(blocksPath, 'utf8');
            const { blocks } = JSON.parse(blocksData);

            const channelId = process.env.SLACK_DIARY_CHANNEL_ID;
            await client.chat.postMessage({
                channel: channelId,
                blocks: blocks,
                text: "Daily Diary Entry" 
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logPath = path.join(logDir, `diary-entry-${timestamp}.json`);
            await fs.writeFile(logPath, blocksData);

            await respond({
                text: 'Diary entry posted successfully!',
                response_type: 'ephemeral'
            });

        } catch (error) {
            console.error('Error handling /deardiary command:', error);
            await respond({
                text: 'Sorry, there was an error processing your command.',
                response_type: 'ephemeral'
            });
        }
    },
};

module.exports = { DearDiaryCommandExport };