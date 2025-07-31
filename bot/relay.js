const { ActivityType, Events, EmbedBuilder } = require("discord.js");

const CHANNEL_ID = '1344986198627713107';
const TIMEZONE = 'Asia/Manila';

const GREETINGS = {
    midnight: {
        hour: 0, // 12:00 AM
        minute: 0,
        titles: [
            '🌙 Midnight Hour!',
            '✨ Late Night Vibes!',
            '🌃 Midnight Magic!',
            '🦉 Night Owl Time!',
            '⭐ Starlight Greetings!'
        ],
        messages: [
            'The clock strikes midnight! Perfect time for night owls! 🦉',
            'Midnight magic is in the air! Hope you\'re having a great night! ✨',
            'Late night energy for all the night shift warriors! 💪',
            'The world is quiet, but we\'re still here! Good midnight! 🌙',
            'Midnight snacks and good vibes! Enjoy the peaceful hour! 🍿',
            'Stars are shining bright at this midnight hour! 🌟',
            'Whether you\'re up late or up early - midnight greetings! 🌃'
        ],
        color: '#191970' // Midnight Blue
    },
    dawn: {
        hour: 3, // 3:00 AM
        minute: 0,
        titles: [
            '🌅 Dawn Break!',
            '✨ Early Dawn!',
            '🌄 Pre-Sunrise!',
            '🐓 Dawn Patrol!',
            '🌸 Early Hours!'
        ],
        messages: [
            'The earliest of early birds! Dawn is breaking! 🌅',
            'Pre-sunrise greetings to all the early risers! 🌄',
            'Dawn patrol checking in! Hope you\'re well rested! 💤',
            'The world is still sleeping, but you\'re ahead of the game! 🎯',
            'Dawn\'s first light brings new possibilities! 🌟',
            'Early morning serenity - enjoy this peaceful time! 🕊️',
            'Rise with the dawn and conquer the day ahead! 💪'
        ],
        color: '#FF69B4' // Hot Pink
    },
    morning: {
        hour: 6, // 6:00 AM
        minute: 0,
        titles: [
            '🌞 Good Morning!',
            '☀️ Rise and Shine!',
            '✨ Morning Sunshine!',
            '🌄 Fresh New Day!',
            '🌅 Sunrise Greetings!'
        ],
        messages: [
            'Rise and shine! Hope you have a wonderful day ahead! ☀️',
            'Good morning everyone! May your coffee be strong and your day be amazing! ☕',
            'The sun is rising! Time to embrace this beautiful morning! 🌅',
            'A new day brings new opportunities! Make it count! 💪',
            'Morning vibes are the best vibes! Spread some positivity today! ✨',
            'Wake up and be awesome! The world is waiting for your greatness! 🌟',
            'Fresh morning air and endless possibilities await! Let\'s go! 🚀'
        ],
        color: '#FFD700' // Gold
    },
    midMorning: {
        hour: 9, // 9:00 AM
        minute: 0,
        titles: [
            '☀️ Mid-Morning!',
            '🌞 Morning Peak!',
            '✨ 9 AM Energy!',
            '🚀 Morning Momentum!',
            '💼 Work Mode On!'
        ],
        messages: [
            'Mid-morning momentum is here! Hope your day is off to a great start! 🚀',
            '9 AM energy boost! Time to tackle those goals! 💼',
            'The morning is in full swing! You\'ve got this! 💪',
            'Coffee should be kicking in about now! Stay productive! ☕',
            'Mid-morning check-in: How\'s your day going so far? 📈',
            'Morning peak hours! Perfect time to get things done! ⚡',
            'The day is young and full of potential! Keep going! 🌟'
        ],
        color: '#FFA500' // Orange
    },
    noon: {
        hour: 12, // 12:00 PM
        minute: 0,
        titles: [
            '☀️ High Noon!',
            '🌞 Midday Greetings!',
            '⏰ Lunch Time!',
            '🌅 Noon Peak!',
            '✨ Midday Magic!'
        ],
        messages: [
            'High noon! The sun is at its peak and so are you! ☀️',
            'Lunch time greetings! Hope you\'re having a productive day! 🍽️',
            'Midday energy is here! Time to refuel and recharge! ⚡',
            'Noon check-in: You\'re halfway through an amazing day! 📊',
            'The sun is directly overhead - perfect timing for a break! 🌞',
            'Midday motivation coming your way! Keep being awesome! 🎯',
            'Lunch break thoughts: You\'re doing great today! 🥪'
        ],
        color: '#FF8C00' // Dark Orange
    },
    afternoon: {
        hour: 15, // 3:00 PM
        minute: 0,
        titles: [
            '🌤️ Good Afternoon!',
            '☀️ Afternoon Vibes!',
            '⚡ 3 PM Energy!',
            '🌻 Afternoon Sunshine!',
            '💪 Afternoon Power!'
        ],
        messages: [
            'Good afternoon! Hope your day continues to shine bright! 🌤️',
            'Afternoon energy boost incoming! You\'re doing amazing! ⚡',
            '3 PM productivity time! Keep up the excellent work! 💼',
            'Afternoon sunshine for your soul! Stay positive! 🌻',
            'The day is progressing beautifully! You\'ve got this! 💪',
            'Afternoon check-in: Still crushing it! Keep going! 📈',
            'Mid-afternoon motivation to carry you through! 🚀'
        ],
        color: '#FF6347' // Tomato
    },
    evening: {
        hour: 18, // 6:00 PM
        minute: 0,
        titles: [
            '🌆 Good Evening!',
            '🌙 Evening Greetings!',
            '🌃 Sunset Time!',
            '✨ Evening Vibes!',
            '🌇 Golden Hour!'
        ],
        messages: [
            'Good evening! The golden hour has arrived! 🌇',
            'Evening greetings! Time to wind down and relax! 🌙',
            'Sunset vibes are here! Hope your day was wonderful! 🌅',
            'Evening check-in: You made it through another great day! 🎉',
            'The day is transitioning to night - enjoy this peaceful time! 🌃',
            'Golden hour magic! Take a moment to appreciate today! ✨',
            'Evening has arrived! Time for reflection and relaxation! 🛋️'
        ],
        color: '#9370DB' // Medium Purple
    },
    night: {
        hour: 21, // 9:00 PM
        minute: 0,
        titles: [
            '🌙 Good Night!',
            '⭐ Evening Stars!',
            '🌃 Night Time!',
            '✨ Starlight Hour!',
            '🦉 Night Owl Time!'
        ],
        messages: [
            'Good night! The stars are starting to twinkle! ⭐',
            'Night time greetings! Hope you can unwind and relax! 🌙',
            '9 PM vibes! Perfect time to slow down and enjoy the evening! 🌃',
            'Night owl time begins! Whether winding down or staying up! 🦉',
            'The day is ending beautifully! Time for some peace and quiet! ✨',
            'Starlight hour! Take a moment to appreciate how far you\'ve come! 🌟',
            'Night time reflection: You did great today! Rest well! 💤'
        ],
        color: '#4B0082' // Indigo
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
      { name: "Milk Survival", type: ActivityType.Playing },
      { name: "Pure Crossplay Survival Server!", type: ActivityType.Listening },
      { name: "Filipino!", type: ActivityType.Competing },
      { name: "Season 3 Released!", type: ActivityType.Playing },
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
        
        // Get Manila time properly for date calculation
        const manilaTimeString = now.toLocaleString("en-US", { timeZone: TIMEZONE });
        const manilaTime = new Date(manilaTimeString);
        
        // Create greeting time string directly from config values
        const hour12 = config.hour > 12 ? config.hour - 12 : (config.hour === 0 ? 12 : config.hour);
        const ampm = config.hour >= 12 ? 'PM' : 'AM';
        const timeString = `${hour12.toString().padStart(2, '0')}:${config.minute.toString().padStart(2, '0')} ${ampm}`;
        
        // Get the correct date in Manila timezone
        const dateString = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: TIMEZONE
        }).format(now);
        
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
        
        if (greetingType === 'midnight') {
            const midnightVibes = [
                'Night shift warriors, this one\'s for you! 🌙',
                'Embrace the quiet magic of midnight! ✨',
                'The world sleeps, but legends stay awake! 🦉',
                'Midnight fuel: snacks and good company! 🍿',
                'Stars witness the dedication of night owls! ⭐'
            ];
            embed.addFields({
                name: '🌙 Midnight Vibes',
                value: midnightVibes[Math.floor(Math.random() * midnightVibes.length)],
                inline: false
            });
        } else if (greetingType === 'dawn') {
            const dawnMotivation = [
                'You\'re ahead of 99% of the world right now! 🌅',
                'Dawn brings the promise of endless possibilities! ✨',
                'Early risers are the architects of success! 🏗️',
                'The silence of dawn is perfect for planning greatness! 🤫',
                'Sunrise warriors deserve extra recognition! 🏆'
            ];
            embed.addFields({
                name: '🌅 Dawn Motivation',
                value: dawnMotivation[Math.floor(Math.random() * dawnMotivation.length)],
                inline: false
            });
        } else if (greetingType === 'morning') {
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
        } else if (greetingType === 'midMorning') {
            const midMorningBoost = [
                'The morning momentum is building! Keep it up! 🚀',
                'Coffee + motivation = unstoppable combination! ☕',
                'Mid-morning is prime productivity time! ⚡',
                'You\'re in the flow state - don\'t stop now! 🌊',
                'Morning goals are getting crushed! Well done! 🎯'
            ];
            embed.addFields({
                name: '🚀 Mid-Morning Boost',
                value: midMorningBoost[Math.floor(Math.random() * midMorningBoost.length)],
                inline: false
            });
        } else if (greetingType === 'noon') {
            const noonEnergy = [
                'Lunch break = brain break! Recharge those batteries! 🔋',
                'Midday sun provides vitamin D and good vibes! ☀️',
                'Half the day conquered, half the adventure remains! ⚖️',
                'Noon check: You\'re doing better than you think! 📊',
                'Fuel up for the afternoon ahead! 🥙'
            ];
            embed.addFields({
                name: '⚡ Noon Energy',
                value: noonEnergy[Math.floor(Math.random() * noonEnergy.length)],
                inline: false
            });
        } else if (greetingType === 'afternoon') {
            const afternoonBoosts = [
                'Keep up the great work! You\'re doing amazing! 💪',
                'Afternoon slump? Not today! You\'ve got this! 💥',
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
        } else if (greetingType === 'night') {
            const nightThoughts = [
                'Night time is perfect for reflection and gratitude! 🙏',
                'Let the day\'s stress melt away with the darkness! 🌙',
                'Whether winding down or staying up - you\'re awesome! 🌟',
                'Night brings peace and the promise of tomorrow! ✨',
                'Rest well, dream big, wake up ready! 💤'
            ];
            embed.addFields({
                name: '🌙 Night Thoughts',
                value: nightThoughts[Math.floor(Math.random() * nightThoughts.length)],
                inline: false
            });
        }
        
        await channel.send({ embeds: [embed] }); //Removed @everyone mention for a more relaxed approach
        
    } catch (error) {
        console.error(`❌ Error sending ${greetingType} greeting:`, error);
    }
}