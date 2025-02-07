/**
 * TEMPLATE CODE
 */


// const HelloSlashCommandExport = {
//     command: '/hello',
//     private: true,
//     privateDenyMessage: '⛔ Sorry, you don\'t have permission to use this command. Message #1',
//     async execute({ command, ack, respond }) {
//         try {
//             await ack();
//             await respond({
//                 text: `Hi there, <@${command.user_id}>! 👋`,
//                 response_type: 'in_channel',
//             });
//             console.log('Command /hello executed successfully!');
//         } catch (error) {
//             console.error('Error handling /hello command:', error);
//             await respond({
//                 text: 'Sorry, there was an error processing your command.',
//                 response_type: 'ephemeral'
//             });
//         }
//     },
// };

// module.exports = { HelloSlashCommandExport };