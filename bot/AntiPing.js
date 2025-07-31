const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const targetUserId = '1342370557009854484';
        
        if (message.author.bot) return;
        
        if (message.mentions.users.has(targetUserId)) {
            try {
                await message.delete();
                
                const embed = new EmbedBuilder()
                    .setTitle('📩 Please Open a Ticket!')
                    .setDescription('Instead of pinging directly, please open a support ticket for assistance.')
                    .setColor('#0099ff')
                    .addFields(
                        { 
                            name: '🎫 How to Open a Ticket', 
                            value: 'Use the appropriate ticket creation method or command available in this server.' 
                        },
                        { 
                            name: '⚡ Why Use Tickets?', 
                            value: 'Tickets help organize support requests and ensure you get proper assistance!' 
                        }
                    )
                    .setFooter({ 
                        text: 'Thank you for your understanding!',
                        iconURL: message.guild?.iconURL() || undefined
                    })
                    .setTimestamp();
                
                await message.channel.send({ 
                    content: `${message.author}, `,
                    embeds: [embed] 
                });
                
            } catch (error) {
                console.error('Error handling ping message:', error);
                
                try {
                    await message.channel.send(
                        `${message.author}, please open a ticket instead of pinging directly. Thank you!`
                    );
                } catch (fallbackError) {
                    console.error('Error sending fallback message:', fallbackError);
                }
            }
        }
    },
};