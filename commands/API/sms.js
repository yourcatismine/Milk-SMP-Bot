const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sms')
        .setDescription('Send an SMS message to a phone number')
        .addStringOption(option =>
            option.setName('phone')
                .setDescription('The phone number to send the SMS to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send via SMS')
                .setRequired(true)),

    async execute(interaction) {
        const phone = interaction.options.getString('phone');
        const message = interaction.options.getString('message');

        // Validate phone number format (11 digits max, Philippine format)
        const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
        if (phoneDigits.length > 11 || phoneDigits.length < 10) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🚫 Invalid Phone Number')
                .setDescription('```yaml\nError: Phone number format is invalid```')
                .addFields(
                    { name: '📱 Required Format', value: '`10-11 digits only`', inline: true },
                    { name: '📊 Your Input', value: `\`${phoneDigits.length} digits\``, inline: true },
                    { name: '✨ Example', value: '`09874892459`', inline: false }
                )
                .setFooter({ 
                    text: '💡 Tip: Remove spaces, dashes, and special characters',
                    iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
                })
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed] });
        }

        // Show sending embed first
        const sendingEmbed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('📤 Sending SMS...')
            .setDescription('```yaml\nStatus: Processing your message```')
            .addFields(
                { name: '📱 Recipient', value: `\`+63${phoneDigits.slice(-10)}\``, inline: true },
                { name: '📝 Message Length', value: `\`${message.length} characters\``, inline: true },
                { name: '⏳ Progress', value: '```\n▓▓▓░░░░░░░ 30%\n```', inline: false }
            )
            .setFooter({ text: '⚡ Please wait while we deliver your message...' })
            .setTimestamp();

        await interaction.reply({ embeds: [sendingEmbed] });

        const API = `https://free-sms-api.svxtract.workers.dev/?number=${phoneDigits}&message=${encodeURIComponent(message)}`;

        try {
            const response = await fetch(API);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Check if the API response indicates success
            if (data.success === true) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#27AE60')
                    .setTitle('✅ SMS Delivered Successfully!')
                    .setDescription('```yaml\nStatus: Message delivered to recipient```')
                    .addFields(
                        { name: '📱 Recipient', value: `\`+63${phoneDigits.slice(-10)}\``, inline: true },
                        { name: '📝 Message', value: `\`\`\`\n${message}\`\`\``, inline: false },
                        { name: '🎯 Delivery Status', value: '```diff\n+ Successfully Delivered\n```', inline: true },
                        { name: '⏰ Sent At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '📊 Message Info', value: `\`${message.length} chars • ${phoneDigits.length} digit number\``, inline: false }
                    )
                    .setFooter({ 
                        text: 'Message delivered instantly',
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                // API returned success: false
                const failureEmbed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setTitle('⚠️ SMS Delivery Failed')
                    .setDescription('```yaml\nStatus: Unable to deliver message```')
                    .addFields(
                        { name: '📱 Target Number', value: `\`+63${phoneDigits.slice(-10)}\``, inline: true },
                        { name: '❌ Error Reason', value: `\`\`\`yaml\n${data.message || data.error || 'Unknown delivery error'}\`\`\``, inline: false },
                        { name: '📝 Your Message', value: message.length > 100 ? `\`${message.substring(0, 100)}...\`` : `\`${message}\``, inline: false },
                        { name: '🔄 What to try', value: '```\n• Check if number is valid\n• Try again in a few minutes\n• Ensure message is under 160 chars\n```', inline: false }
                    )
                    .setFooter({ 
                        text: '💡 Contact support if this issue persists',
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [failureEmbed] });
            }

        } catch (error) {
            console.error('SMS Error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#C0392B')
                .setTitle('💥 System Error Occurred')
                .setDescription('```yaml\nStatus: Internal service error```')
                .addFields(
                    { name: '🔍 Error Details', value: `\`\`\`js\n${error.message || 'Unknown system error'}\`\`\``, inline: false },
                    { name: '📱 Target Number', value: `\`+63${phoneDigits.slice(-10)}\``, inline: true },
                    { name: '🛠️ Troubleshooting', value: '```\n• Check your internet connection\n• Verify the SMS service is online\n• Try again in a few moments\n```', inline: false },
                    { name: '📞 Support', value: '`Contact the bot administrator if error persists`', inline: false }
                )
                .setFooter({ 
                    text: '🚨 System Error • Please try again later',
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}