const { Events, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuration
const WHITELIST_CHANNEL_ID = '1433815944735494254'; // Change to your whitelist request channel ID
const CONFIRMATION_CHANNEL_ID = '1432568321387134996'; // Change to staff notification channel ID
const STAFF_ROLE_ID = '1433817171297042525'; // Change to your staff role ID
const COOLDOWN_DURATION = 86400000; // 24 hours cooldown between requests

// WHITELIST REQUESTER SETTING:
// Set this to true to ALLOW admins/staff to send whitelist requests
// Set this to false to BLOCK admins/staff from sending whitelist requests
const ALLOW_ADMIN_REQUESTS = true;

const REQUESTS_FILE = path.join(__dirname, 'whitelist_requests.json');

// Store pending requests (gamertag -> user data)
let pendingRequests = new Map();
// Store user cooldowns (userId -> timestamp)
let userCooldowns = new Map();

// Load pending requests from file
function loadRequests() {
    try {
        if (fs.existsSync(REQUESTS_FILE)) {
            const data = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
            pendingRequests = new Map(Object.entries(data));
            console.log(`✅ Loaded ${pendingRequests.size} pending whitelist requests`);
        }
    } catch (error) {
        console.error('❌ Error loading whitelist requests:', error);
    }
}

// Save pending requests to file
function saveRequests() {
    try {
        const data = Object.fromEntries(pendingRequests);
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving whitelist requests:', error);
    }
}

// Check if user is on cooldown
function isOnCooldown(userId) {
    if (!userCooldowns.has(userId)) return false;
    const cooldownEnd = userCooldowns.get(userId);
    const now = Date.now();
    
    if (now > cooldownEnd) {
        userCooldowns.delete(userId);
        return false;
    }
    return true;
}

// Get remaining cooldown time
function getRemainingCooldown(userId) {
    const cooldownEnd = userCooldowns.get(userId);
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - Date.now());
}

// Set cooldown for user
function setCooldown(userId) {
    userCooldowns.set(userId, Date.now() + COOLDOWN_DURATION);
    console.log(`⏱️ Cooldown set for user ${userId}`);
}

// Extract gamertag from message
function extractGamertag(content) {
    const trimmed = content.trim();
    console.log(`   [EXTRACT] Trying to extract from: "${trimmed}" (length: ${trimmed.length})`);
    
    // First check: is it all word characters and between 2-16 length?
    if (/^\w{2,16}$/.test(trimmed)) {
        console.log(`   [EXTRACT] ✅ Matches pattern! Gamertag: "${trimmed}"`);
        return trimmed;
    }
    
    console.log(`   [EXTRACT] ❌ Does not match pattern ^\w{2,16}$ (need 2-16 word chars)`);
    
    // If it has spaces or other content, try to extract just the first word
    const words = trimmed.split(/\s+/);
    if (words.length > 0) {
        const firstWord = words[0];
        console.log(`   [EXTRACT] Checking first word: "${firstWord}" (length: ${firstWord.length})`);
        if (/^\w{2,16}$/.test(firstWord)) {
            console.log(`   [EXTRACT] ✅ Found valid gamertag in first word: "${firstWord}"`);
            return firstWord;
        }
    }
    
    console.log(`   [EXTRACT] ❌ No valid gamertag found`);
    return null;
}

// Create confirmation embed
function createConfirmationEmbed(gamertag, user) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('✅ Whitelist Request Received')
        .setDescription(`Your whitelist request is being processed!`)
        .addFields(
            { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\`` },
            { name: '👤 Discord User', value: `${user.username}#${user.discriminator || '0'}` },
            { name: '⏳ Status', value: 'Waiting for staff confirmation' }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Please wait while staff reviews your request' })
        .setTimestamp();
}

// Create admin notification embed with buttons
function createAdminNotificationEmbed(gamertag, user, userId) {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔔 New Whitelist Request')
        .setDescription(`A user has requested to be whitelisted!`)
        .addFields(
            { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\`` },
            { name: '👤 Discord Username', value: `${user.username}` },
            { name: '🆔 User ID', value: `\`${userId}\`` },
            { name: '🖼️ Avatar URL', value: `[Click Here](${user.displayAvatarURL({ dynamic: true })})`  },
            { name: '⏰ Requested At', value: new Date().toLocaleString() }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor('#00FF00');
}

// Create accept/deny buttons
function createDecisionButtons(gamertag) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`whitelist_accept_${gamertag}`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`whitelist_deny_${gamertag}`)
                .setLabel('❌ Deny')
                .setStyle(ButtonStyle.Danger)
        );
}

// Create result embed for user
function createResultEmbed(gamertag, user, approved) {
    return new EmbedBuilder()
        .setColor(approved ? '#00FF00' : '#FF0000')
        .setTitle(approved ? '✅ Whitelist Approved!' : '❌ Whitelist Denied')
        .setDescription(approved 
            ? `Your whitelist request has been **APPROVED**! Welcome to the server!`
            : `Your whitelist request has been **DENIED**. Please contact staff for more information.`)
        .addFields(
            { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\`` },
            { name: '📅 Processed At', value: new Date().toLocaleString() }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: approved ? 'Enjoy the server!' : 'Feel free to reapply later' })
        .setTimestamp();
}

loadRequests();

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ WHITELIST SYSTEM LOADED`);
console.log(`   Whitelist Channel: ${WHITELIST_CHANNEL_ID}`);
console.log(`   Staff Channel: ${CONFIRMATION_CHANNEL_ID}`);
console.log(`   Staff Role: ${STAFF_ROLE_ID}`);
console.log(`   Cooldown: ${COOLDOWN_DURATION / 1000 / 60} minutes`);
console.log(`${'='.repeat(60)}\n`);

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Ignore bot messages
            if (message.author.bot) return;

            // Only listen in the whitelist channel - check FIRST before any logging
            if (message.channel.id !== WHITELIST_CHANNEL_ID) return;
            
            // Now log only messages in the whitelist channel
            console.log(`\n[WHITELIST] New message: "${message.content}" | Channel: ${message.channel.id} | Author: ${message.author.username}`);

            // Ignore messages from staff/bots
            if (message.member?.permissions.has('ADMINISTRATOR')) {
                if (!ALLOW_ADMIN_REQUESTS) {
                    console.log(`[WHITELIST] Ignoring admin message (ALLOW_ADMIN_REQUESTS = false)`);
                    return;
                }
                console.log(`[WHITELIST] ✅ Admin message allowed (ALLOW_ADMIN_REQUESTS = true)`);
            }
            
            console.log(`[WHITELIST] ✅ Not admin or admin requests allowed - continuing...`);

            const content = message.content.trim();
            console.log(`[WHITELIST] Content to process: "${content}"`);
            const gamertag = extractGamertag(content);
            
            // Debug: Log extraction result
            console.log(`🔍 Content: "${content}" | Extracted gamertag: "${gamertag}"`);

            // If no valid gamertag format detected, return
            if (!gamertag) {
                console.log(`❌ Gamertag was null/empty - ignoring message`);
                return;
            }
            
            console.log(`✅ Valid gamertag found! Proceeding with request...`);

            const userId = message.author.id;

            // Check if user is on cooldown
            if (isOnCooldown(userId)) {
                const remainingMs = getRemainingCooldown(userId);
                const remainingMins = Math.ceil(remainingMs / 60000);
                
                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⏱️ Cooldown Active')
                    .setDescription(`You've already requested whitelist recently!`)
                    .addFields(
                        { name: 'Please wait', value: `${remainingMins} minutes before requesting again` }
                    )
                    .setFooter({ text: 'This is to prevent spam' })
                    .setTimestamp();

                const reply = await message.reply({ 
                    embeds: [cooldownEmbed], 
                    flags: 64 // Ephemeral
                });

                // Delete both the user's message and the bot's reply after 10 seconds
                setTimeout(() => {
                    message.delete().catch(() => {});
                    reply.delete().catch(() => {});
                }, 10000);
                return;
            }

            // Check if user already has a pending request
            const userHasPending = Array.from(pendingRequests.values()).some(req => req.userId === userId);
            if (userHasPending) {
                const pendingEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('⏳ Request Already Pending')
                    .setDescription(`You already have a pending whitelist request!`)
                    .addFields(
                        { name: 'Wait for staff response', value: 'Your current request is being reviewed' }
                    )
                    .setFooter({ text: 'Only one request allowed at a time' })
                    .setTimestamp();

                const reply = await message.reply({ 
                    embeds: [pendingEmbed], 
                    flags: 64 // Ephemeral
                });

                // Delete both messages after 10 seconds
                setTimeout(() => {
                    message.delete().catch(() => {});
                    reply.delete().catch(() => {});
                }, 10000);
                return;
            }

            // Store temporarily (not final until confirmed)
            const tempRequestData = {
                gamertag,
                userId,
                username: message.author.username,
                discriminator: message.author.discriminator,
                avatarURL: message.author.displayAvatarURL({ dynamic: true }),
                requestedAt: new Date().toISOString(),
                messageId: message.id,
                status: 'pending_confirmation'
            };

            // Create confirmation buttons
            const confirmationButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`whitelist_confirm_${gamertag}_${userId}`)
                        .setLabel('✅ Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`whitelist_cancel_${gamertag}_${userId}`)
                        .setLabel('❌ Cancel/Edit')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Send confirmation to user (ephemeral with buttons)
            const confirmEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✅ Confirm Your Whitelist Request')
                .setDescription(`Please verify your Minecraft gamertag:`)
                .addFields(
                    { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\``, inline: false },
                    { name: '⚠️ Make sure this is correct!', value: 'Click **Confirm** to proceed or **Cancel** to change it.', inline: false }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'You can only confirm once per hour' })
                .setTimestamp();

            const userConfirmation = await message.reply({ 
                embeds: [confirmEmbed],
                components: [confirmationButtons],
                flags: 64 // Ephemeral
            });

            // Store temporarily for 10 minutes (user needs to confirm within this time)
            const tempRequestKey = `temp_${userId}_${gamertag}`;
            pendingRequests.set(tempRequestKey, tempRequestData);
            saveRequests();

            // Delete user's original message
            setTimeout(() => {
                message.delete().catch(() => {});
            }, 1000);

            // Auto-delete confirmation buttons after 5 minutes if not confirmed
            setTimeout(() => {
                userConfirmation.delete().catch(() => {});
            }, 300000);

            console.log(`⏳ Temporary whitelist request created for ${message.author.username} - waiting for confirmation...`);

        } catch (error) {
            console.error('❌ Error in whitelist message handler:', error);
        }
    }
};

// Export button interaction handler
module.exports.handleButtonInteraction = async function(interaction, client) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    
    // Handle user confirmation button
    if (customId.startsWith('whitelist_confirm_')) {
        const parts = customId.split('_');
        const gamertag = parts[2];
        const userId = parts[3];
        
        if (userId !== interaction.user.id) {
            await interaction.reply({ 
                content: '❌ This confirmation is not for you!',
                flags: 64 // Ephemeral
            });
            return;
        }

        // Find the temporary request
        const tempKey = `temp_${userId}_${gamertag}`;
        const requestData = pendingRequests.get(tempKey);

        if (!requestData) {
            await interaction.reply({ 
                content: '❌ Request not found or already expired!',
                flags: 64 // Ephemeral
            });
            return;
        }

        try {
            // Delete temporary entry
            pendingRequests.delete(tempKey);
            
            // Create final request
            const finalRequestData = {
                ...requestData,
                status: 'pending',
                confirmedAt: new Date().toISOString()
            };

            // Store final request
            pendingRequests.set(gamertag, finalRequestData);
            
            // Set cooldown NOW that it's confirmed
            setCooldown(userId);
            
            saveRequests();

            // Send to staff channel
            try {
                const staffChannel = await interaction.guild.channels.fetch(CONFIRMATION_CHANNEL_ID);
                if (staffChannel?.isTextBased()) {
                    const adminEmbed = createAdminNotificationEmbed(gamertag, interaction.user, userId);
                    const buttons = createDecisionButtons(gamertag);

                    const adminMessage = await staffChannel.send({
                        content: `<@&${STAFF_ROLE_ID}>`, // Mention staff role
                        embeds: [adminEmbed],
                        components: [buttons]
                    });

                    // Store admin message ID
                    finalRequestData.adminMessageId = adminMessage.id;
                    pendingRequests.set(gamertag, finalRequestData);
                    saveRequests();

                    console.log(`✅ Whitelist request CONFIRMED from ${interaction.user.username} for gamertag: ${gamertag}`);
                }
            } catch (error) {
                console.error('❌ Error sending staff notification:', error);
            }

            // Update user's confirmation message
            await interaction.update({
                content: '✅ Your whitelist request has been submitted! Staff will review it soon.',
                components: [],
                embeds: []
            }).catch(() => {});

        } catch (error) {
            console.error('❌ Error confirming whitelist request:', error);
            await interaction.reply({ 
                content: '❌ Error confirming request!',
                flags: 64 // Ephemeral
            });
        }
    }

    // Handle user cancellation button
    if (customId.startsWith('whitelist_cancel_')) {
        const parts = customId.split('_');
        const gamertag = parts[2];
        const userId = parts[3];
        
        if (userId !== interaction.user.id) {
            await interaction.reply({ 
                content: '❌ This cancellation is not for you!',
                flags: 64 // Ephemeral
            });
            return;
        }

        // Delete temporary request
        const tempKey = `temp_${userId}_${gamertag}`;
        pendingRequests.delete(tempKey);
        saveRequests();

        // Update confirmation message
        await interaction.update({
            content: '❌ Request cancelled. You can send a new gamertag to try again!',
            components: [],
            embeds: []
        }).catch(() => {});

        console.log(`❌ Whitelist request CANCELLED by ${interaction.user.username} for gamertag: ${gamertag}`);
    }
    
    // Handle accept button
    if (customId.startsWith('whitelist_accept_')) {
        const gamertag = customId.replace('whitelist_accept_', '');
        const requestData = pendingRequests.get(gamertag);

        if (!requestData) {
            await interaction.reply({ 
                content: '❌ Request not found or already processed!',
                flags: 64 // Ephemeral
            });
            return;
        }

        try {
            const user = await client.users.fetch(requestData.userId);
            const member = await interaction.guild.members.fetch(requestData.userId);
            
            // Set nickname to ᴍɪʟᴋ - {gamertag}
            const newNickname = `ᴍɪʟᴋ - ${gamertag}`;
            try {
                await member.setNickname(newNickname);
                console.log(`✅ Set nickname for ${user.username} to: ${newNickname}`);
            } catch (err) {
                console.error(`❌ Could not set nickname for ${user.username}:`, err.message);
            }
            
            // Send approval embed to user
            const approvalEmbed = createResultEmbed(gamertag, user, true);
            let dmFailed = false;
            await user.send({ embeds: [approvalEmbed] }).catch((err) => {
                console.log(`❌ Could not DM user ${requestData.userId}: ${err.message}`);
                dmFailed = true;
            });

            // If DM failed, mention user in whitelist channel
            if (dmFailed) {
                try {
                    const whitelistChannel = await interaction.guild.channels.fetch(WHITELIST_CHANNEL_ID);
                    if (whitelistChannel?.isTextBased()) {
                        await whitelistChannel.send({
                            content: `<@${requestData.userId}> Your whitelist request for **${gamertag}** has been **APPROVED**! ✅ Welcome to the server!`
                        });
                        console.log(`✅ Sent approval mention to whitelist channel for user ${requestData.userId}`);
                    }
                } catch (err) {
                    console.error(`❌ Could not send mention to whitelist channel:`, err);
                }
            }

            // Update the admin message with a note
            const approvalNote = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Whitelist Approved')
                .setDescription(`Gamertag: \`${gamertag}\` has been **APPROVED** and notified.${dmFailed ? ' (via mention in whitelist channel)' : ''}`)
                .setFooter({ text: `Approved by ${interaction.user.username}` })
                .setTimestamp();

            await interaction.update({
                embeds: [interaction.message.embeds[0], approvalNote],
                components: [] // Remove buttons
            });

            // Remove from pending
            pendingRequests.delete(gamertag);
            saveRequests();

            console.log(`✅ Whitelist approved for ${gamertag} by ${interaction.user.username}`);

        } catch (error) {
            console.error('❌ Error approving whitelist:', error);
            await interaction.reply({ 
                content: '❌ Error approving request!',
                flags: 64 // Ephemeral
            });
        }
    }

    // Handle deny button
    if (customId.startsWith('whitelist_deny_')) {
        const gamertag = customId.replace('whitelist_deny_', '');
        const requestData = pendingRequests.get(gamertag);

        if (!requestData) {
            await interaction.reply({ 
                content: '❌ Request not found or already processed!',
                flags: 64 // Ephemeral
            });
            return;
        }

        try {
            const user = await client.users.fetch(requestData.userId);
            
            // Send denial embed to user
            const denialEmbed = createResultEmbed(gamertag, user, false);
            let dmFailed = false;
            await user.send({ embeds: [denialEmbed] }).catch((err) => {
                console.log(`❌ Could not DM user ${requestData.userId}: ${err.message}`);
                dmFailed = true;
            });

            // If DM failed, mention user in whitelist channel
            if (dmFailed) {
                try {
                    const whitelistChannel = await interaction.guild.channels.fetch(WHITELIST_CHANNEL_ID);
                    if (whitelistChannel?.isTextBased()) {
                        await whitelistChannel.send({
                            content: `<@${requestData.userId}> Your whitelist request for **${gamertag}** has been **DENIED**. ❌ Please contact staff for more information.`
                        });
                        console.log(`✅ Sent denial mention to whitelist channel for user ${requestData.userId}`);
                    }
                } catch (err) {
                    console.error(`❌ Could not send mention to whitelist channel:`, err);
                }
            }

            // Update the admin message with a note
            const denialNote = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Whitelist Denied')
                .setDescription(`Gamertag: \`${gamertag}\` has been **DENIED** and notified.${dmFailed ? ' (via mention in whitelist channel)' : ''}`)
                .setFooter({ text: `Denied by ${interaction.user.username}` })
                .setTimestamp();

            await interaction.update({
                embeds: [interaction.message.embeds[0], denialNote],
                components: [] // Remove buttons
            });

            // Remove from pending
            pendingRequests.delete(gamertag);
            saveRequests();

            // Reset user cooldown so they can try again
            userCooldowns.delete(requestData.userId);

            console.log(`❌ Whitelist denied for ${gamertag} by ${interaction.user.username}`);

        } catch (error) {
            console.error('❌ Error denying whitelist:', error);
            await interaction.reply({ 
                content: '❌ Error denying request!',
                flags: 64 // Ephemeral
            });
        }
    }
};
