const { Logger } = require('../classes/Logger.js');

const logger = new Logger();

const PingSlashCommandExport = {
    command: '/ping',
    private: false,
    privateDenyMessage: '⛔ Sorry, you don\'t have permission to use this command',
    async execute({ command, ack, respond }) {
        try {
            await ack();
            await respond({
                text: `Pong!`,
                response_type: 'in_channel',
            });
            logger.success(`Command ${command} executed successfully!`);
        } catch (error) {
            logger.error(`Error handling ${command} command: ${error.message}`);
            await respond({
                text: 'Sorry, there was an error processing your command.',
                response_type: 'ephemeral'
            });
        }
    },
};

module.exports = { PingSlashCommandExport };
