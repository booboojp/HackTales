const fs = require('fs').promises;
const path = require('path');

const channelsDataPath = path.join(__dirname, '../data/channels.json');

const readChannelsData = async () => {
    try {
        const data = await fs.readFile(channelsDataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        await fs.writeFile(channelsDataPath, JSON.stringify({ channels: [] }));
        return { channels: [] };
    }
};

const writeChannelsData = async (data) => {
    await fs.writeFile(channelsDataPath, JSON.stringify(data, null, 2));
};

const CreateChannelCommandExport = {
    command: '/createchannel',
    private: true,
    privateDenyMessage: 'Only authorized users can create channels.',
    async execute({ command, client, ack, respond }) {
        await ack();
        const channelName = command.text.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        
        try {
            const result = await client.conversations.create({
                name: channelName,
                is_private: true
            });

            const channelsData = await readChannelsData();
            channelsData.channels.push({
                id: result.channel.id,
                name: channelName,
                created: new Date().toISOString(),
                creator: command.user_id
            });
            await writeChannelsData(channelsData);

            await respond({
                text: `Channel #${channelName} created successfully!`,
                response_type: 'ephemeral'
            });
        } catch (error) {
            await respond({
                text: `Failed to create channel: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    }
};

const DeleteChannelCommandExport = {
    command: '/deletechannel',
    private: true,
    privateDenyMessage: 'Only authorized users can delete channels.',
    async execute({ command, client, ack, respond }) {
        await ack();
        const channelName = command.text.toLowerCase();

        try {
            const channelsData = await readChannelsData();
            const channel = channelsData.channels.find(c => c.name === channelName);
            
            if (!channel) {
                throw new Error('Channel not found in records');
            }

            await client.conversations.archive({
                channel: channel.id
            });

            channelsData.channels = channelsData.channels.filter(c => c.name !== channelName);
            await writeChannelsData(channelsData);

            await respond({
                text: `Channel #${channelName} archived successfully!`,
                response_type: 'ephemeral'
            });
        } catch (error) {
            await respond({
                text: `Failed to delete channel: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    }
};

const ListChannelsCommandExport = {
    command: '/listchannels',
    private: false,
    async execute({ command, ack, respond }) {
        await ack();
        
        try {
            const channelsData = await readChannelsData();
            const channelList = channelsData.channels.map(c => 
                `• #${c.name} (Created: ${new Date(c.created).toLocaleDateString()})`
            ).join('\n');

            await respond({
                text: `*Managed Channels:*\n${channelList || 'No channels found'}`,
                response_type: 'ephemeral'
            });
        } catch (error) {
            await respond({
                text: `Failed to list channels: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    }
};

module.exports = {
    CreateChannelCommandExport,
    DeleteChannelCommandExport,
    ListChannelsCommandExport
};