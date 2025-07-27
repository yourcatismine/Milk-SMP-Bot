const { ActivityType, Events, EmbedBuilder } = require("discord.js");

const CHANNEL_ID = '1344986198627713107';
const TIMEZONE = 'Asia/Manila';

const GREETINGS = {
    morning: {
        hour: 5,
        minute: 0,
        title: '🌅 Good Morning!',
        message: 'Rise and shine! Hope you have a wonderful day ahead! ☀️',
        color: '#FFD700' // Gold
    },
    afternoon: {
        hour: 12,
        minute: 0,
        title: '☀️ Good Afternoon!',
        message: 'The sun is shining bright! Have a productive afternoon! 🌞',
        color: '#FF8C00' // Dark Orange
    },
    evening: {
        hour: 18, // 6:00 PM in 24-hour format
        minute: 0,
        title: '🌆 Good Evening!',
        message: 'The day is winding down. Hope you had a great day! 🌙',
        color: '#9370DB' // Medium Purple
    }
};

const sentToday = new Set();

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`EnderSMP`);

    // Bot Status System
    const statuses = [
      { name: "Milk SMP", type: ActivityType.Playing },
      { name: "Paid Bedrock Server!", type: ActivityType.Listening },
      { name: "Filipino!", type: ActivityType.Competing },
      { name: "Season 2 Released!", type: ActivityType.Playing },
    ];

    function updateStatus() {
      const random = statuses[Math.floor(Math.random() * statuses.length)];

      client.user.setPresence({
        activities: [{ name: random.name, type: random.type }],
        status: "dnd",
      });

      const nextUpdate = Math.floor(Math.random() * 10000) + 10000;
      setTimeout(updateStatus, nextUpdate);
    }

    updateStatus();

    console.log('📅 Time Greetings System Started!');
    
    setInterval(async () => {
        await checkAndSendGreetings(client);
    }, 60000);
    
    setTimeout(() => checkAndSendGreetings(client), 5000);
  },
};

async function checkAndSendGreetings(client) {
    try {
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
        
        const currentHour = manilaTime.getHours();
        const currentMinute = manilaTime.getMinutes();
        const dateKey = manilaTime.toDateString();
        
        if (currentHour === 0 && currentMinute === 0) {
            sentToday.clear();
            console.log('🔄 Daily greeting tracker reset');
        }
        
        for (const [greetingType, config] of Object.entries(GREETINGS)) {
            const greetingKey = `${dateKey}-${greetingType}`;
            
            if (currentHour === config.hour && 
                currentMinute === config.minute && 
                !sentToday.has(greetingKey)) {
                
                await sendGreeting(client, config, greetingType);
                sentToday.add(greetingKey);
                
                console.log(`✅ Sent ${greetingType} greeting at ${currentHour}:${currentMinute.toString().padStart(2, '0')} Manila Time`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error in time greetings system:', error);
    }
}

async function sendGreeting(client, config, greetingType) {
    try {
        const channel = client.channels.cache.get(CHANNEL_ID);
        
        if (!channel) {
            console.error(`❌ Channel with ID ${CHANNEL_ID} not found!`);
            return;
        }
        
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
        const timeString = manilaTime.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            timeZone: TIMEZONE
        });
        
        const dateString = manilaTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: TIMEZONE
        });
        
        const embed = new EmbedBuilder()
            .setTitle(config.title)
            .setDescription(config.message)
            .setColor(config.color)
            .addFields(
                {
                    name: '📍 Location',
                    value: '`Philippines (Manila)`',
                    inline: true
                },
                {
                    name: '🕐 Current Time',
                    value: `\`${timeString}\``,
                    inline: true
                },
                {
                    name: '📅 Date',
                    value: `\`${dateString}\``,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Auto-sent • Manila Time`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        if (greetingType === 'morning') {
            embed.addFields({
                name: '💡 Morning Tip',
                value: 'Start your day with a smile and positive thoughts! 😊',
                inline: false
            });
        } else if (greetingType === 'afternoon') {
            embed.addFields({
                name: '⚡ Afternoon Boost',
                value: 'Keep up the great work! You\'re doing amazing! 💪',
                inline: false
            });
        } else if (greetingType === 'evening') {
            embed.addFields({
                name: '🌟 Evening Reflection',
                value: 'Take a moment to appreciate what you accomplished today! ✨',
                inline: false
            });
        }
        
        await channel.send({ embeds: [embed], content: '@everyone' });
        
    } catch (error) {
        console.error(`❌ Error sending ${greetingType} greeting:`, error);
    }
}