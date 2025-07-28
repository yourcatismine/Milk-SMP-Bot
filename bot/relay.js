const { ActivityType, Events, EmbedBuilder } = require("discord.js");

const CHANNEL_ID = '1344986198627713107';
const TIMEZONE = 'Asia/Manila';

const GREETINGS = {
    morning: {
        hour: 5,
        minute: 0,
        titles: [
            '🌅 Good Morning!',
            '🌞 Rise and Shine!',
            '✨ Morning Sunshine!',
            '🌄 Fresh New Day!',
            '☀️ Wakey Wakey!'
        ],
        messages: [
            'Rise and shine! Hope you have a wonderful day ahead! ☀️',
            'Good morning everyone! May your coffee be strong and your day be amazing! ☕',
            'The early bird catches the worm! Have a fantastic morning! 🐦',
            'A new day brings new opportunities! Make it count! 💪',
            'Morning vibes are the best vibes! Spread some positivity today! ✨',
            'Wake up and be awesome! The world is waiting for your greatness! 🌟',
            'Fresh morning air and endless possibilities await! Let\'s go! 🚀'
        ],
        color: '#FFD700' // Gold
    },
    afternoon: {
        hour: 12,
        minute: 0,
        titles: [
            '☀️ Good Afternoon!',
            '🌞 Midday Greetings!',
            '⏰ Noon Time!',
            '🌅 Afternoon Vibes!',
            '✨ Midday Magic!'
        ],
        messages: [
            'The sun is shining bright! Have a productive afternoon! 🌞',
            'Afternoon energy is here! Time to conquer the rest of your day! ⚡',
            'Hope your morning was great! Let\'s make this afternoon even better! 🎯',
            'Midday motivation coming your way! You\'ve got this! 💼',
            'Afternoon sunshine to brighten your day! Keep being awesome! 🌻',
            'Halfway through the day and you\'re doing amazing! Keep it up! 📈',
            'Lunch time thoughts: You\'re crushing it today! 🍽️'
        ],
        color: '#FF8C00' // Dark Orange
    },
    evening: {
        hour: 18, // 6:00 PM in 24-hour format
        minute: 0,
        titles: [
            '🌆 Good Evening!',
            '🌙 Evening Greetings!',
            '🌃 Sunset Time!',
            '✨ Evening Vibes!',
            '🌇 End of Day!'
        ],
        messages: [
            'The day is winding down. Hope you had a great day! 🌙',
            'Evening has arrived! Time to relax and unwind! 🛋️',
            'As the sun sets, take a moment to appreciate today\'s achievements! 🌅',
            'Good evening! Hope your day was filled with joy and success! 🎉',
            'The golden hour is here! Enjoy this peaceful evening! 🌇',
            'Evening reflections: You made it through another day! Well done! 👏',
            'Time to slow down and enjoy the evening breeze! 🍃'
        ],
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
        
        // Create a specific time object for the scheduled greeting time
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
        
        // Set the time to the exact greeting time
        const greetingTime = new Date(manilaTime);
        greetingTime.setHours(config.hour, config.minute, 0, 0);
        
        const timeString = greetingTime.toLocaleTimeString('en-US', {
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
        
        // Select random title and message
        const randomTitle = config.titles[Math.floor(Math.random() * config.titles.length)];
        const randomMessage = config.messages[Math.floor(Math.random() * config.messages.length)];
        
        const embed = new EmbedBuilder()
            .setTitle(randomTitle)
            .setDescription(randomMessage)
            .setColor(config.color)
            .addFields(
                {
                    name: '📍 Location',
                    value: '`Philippines (Manila)`',
                    inline: true
                },
                {
                    name: '🕐 Greeting Time',
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
            const morningTips = [
                'Start your day with a smile and positive thoughts! 😊',
                'A good morning routine sets the tone for success! 🌟',
                'Hydrate and stretch - your body will thank you! 💧',
                'Take a deep breath and embrace the new day! 🌬️',
                'Remember: Every morning is a fresh start! 🔄'
            ];
            embed.addFields({
                name: '💡 Morning Tip',
                value: morningTips[Math.floor(Math.random() * morningTips.length)],
                inline: false
            });
        } else if (greetingType === 'afternoon') {
            const afternoonBoosts = [
                'Keep up the great work! You\'re doing amazing! 💪',
                'Take a quick break and recharge your energy! 🔋',
                'Stay focused - you\'re closer to your goals! 🎯',
                'A little afternoon motivation never hurt anyone! ⚡',
                'Power through! The finish line is in sight! 🏁'
            ];
            embed.addFields({
                name: '⚡ Afternoon Boost',
                value: afternoonBoosts[Math.floor(Math.random() * afternoonBoosts.length)],
                inline: false
            });
        } else if (greetingType === 'evening') {
            const eveningReflections = [
                'Take a moment to appreciate what you accomplished today! ✨',
                'Reflect on the good moments from your day! 🌸',
                'You survived another day - that\'s worth celebrating! 🎊',
                'Time to relax and prepare for tomorrow\'s adventures! 🛤️',
                'Count your blessings, not your problems! 🙏'
            ];
            embed.addFields({
                name: '🌟 Evening Reflection',
                value: eveningReflections[Math.floor(Math.random() * eveningReflections.length)],
                inline: false
            });
        }
        
        await channel.send({ embeds: [embed], content: '@everyone' });
        
    } catch (error) {
        console.error(`❌ Error sending ${greetingType} greeting:`, error);
    }
}