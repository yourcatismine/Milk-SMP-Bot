const { Events, EmbedBuilder } = require('discord.js');

const COUNTING_CHANNEL_ID = '1359038929730404352';

let currentNumber = 0;
let lastUser = null;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        if (message.channel.id !== COUNTING_CHANNEL_ID) return;

        const content = message.content.trim();
        const expectedNumber = currentNumber + 1;

        // Check if message is a number
        if (!/^\d+$/.test(content)) {
            currentNumber = 0;
            lastUser = null;
            message.react('❌').catch(() => {});
            
            const invalidEmbed = new EmbedBuilder()
                .setColor('#ff4757')
                .setTitle('🚨 Invalid Number!')
                .setDescription('That wasn\'t a number! Only send numbers to keep the count going.')
                .addFields(
                    { name: '💥 Count Reset!', value: 'The count has been reset to **0**', inline: true },
                    { name: '🎯 Next Number', value: '**1**', inline: true }
                )
                .setFooter({ text: 'Keep counting consecutively!' })
                .setTimestamp();
            
            return message.channel.send({ embeds: [invalidEmbed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            });
        }

        const userNumber = parseInt(content);

        // Check if it's the correct number
        if (userNumber !== expectedNumber) {
            currentNumber = 0;
            lastUser = null;
            message.react('❌').catch(() => {});
            
            const wrongEmbed = new EmbedBuilder()
                .setColor('#ff6b81')
                .setTitle('💔 Wrong Number!')
                .setDescription(`Oops! That's not the right number in sequence.`)
                .addFields(
                    { name: '❌ You Said', value: `**${userNumber}**`, inline: true },
                    { name: '✅ Expected', value: `**${expectedNumber}**`, inline: true },
                    { name: '🔄 Status', value: 'Count Reset!', inline: true }
                )
                .addFields(
                    { name: '🎯 Next Number', value: '**1**', inline: false }
                )
                .setFooter({ text: 'Pay attention to the sequence!' })
                .setTimestamp();
            
            return message.channel.send({ embeds: [wrongEmbed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            });
        }

        if (lastUser === message.author.id) {
            message.react('❌').catch(() => {});
            
            const doubleEmbed = new EmbedBuilder()
                .setColor('#ffa502')
                .setTitle('⚠️ Hold Up!')
                .setDescription('You can\'t count twice in a row! Let someone else have a turn.')
                .addFields(
                    { name: '🎮 Rule', value: 'Take turns counting!', inline: true },
                    { name: '🔢 Current Number', value: `**${currentNumber}**`, inline: true }
                )
                .setFooter({ text: 'Let others participate too!' })
                .setTimestamp();
            
            return message.channel.send({ embeds: [doubleEmbed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 4000);
            });
        }

        currentNumber = userNumber;
        lastUser = message.author.id;

        message.react('✅').catch(() => {});

        if (userNumber % 100 === 0) {
            const milestoneEmbed = new EmbedBuilder()
                .setColor('#2ed573')
                .setTitle('🎉 MILESTONE ACHIEVED! 🎉')
                .setDescription(`Incredible! You've reached **${userNumber}**!`)
                .addFields(
                    { name: '🏆 Achievement', value: `**${userNumber}** Numbers Counted!`, inline: true },
                    { name: '👤 Counter', value: `${message.author}`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Keep the streak going!' })
                .setTimestamp();
                
            message.channel.send({ embeds: [milestoneEmbed] });
        } else if (userNumber % 50 === 0) {
            const halfMilestoneEmbed = new EmbedBuilder()
                .setColor('#ffa726')
                .setTitle('🔥 Half Century!')
                .setDescription(`Nice work! You hit **${userNumber}**!`)
                .addFields(
                    { name: '📈 Progress', value: `**${userNumber}** and counting!`, inline: true },
                    { name: '👤 Counter', value: `${message.author}`, inline: true }
                )
                .setFooter({ text: 'Halfway to the next milestone!' })
                .setTimestamp();
                
            message.channel.send({ embeds: [halfMilestoneEmbed] });
        }
    },
};