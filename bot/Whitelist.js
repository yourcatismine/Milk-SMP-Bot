const { Events, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuration
const WHITELIST_CHANNEL_ID = '1433815944735494254'; // Change to your whitelist request channel ID
const CONFIRMATION_CHANNEL_ID = '1432568321387134996'; // Change to staff notification channel ID
const STAFF_ROLE_ID = '1433817171297042525'; // Change to your staff role ID
const APPROVED_ROLE_ID = '1433817171297042525'; // Role ID to assign when user is approved (leave empty to disable role assignment)
const CONTENT_CHANNEL_ID = '1431105707649798205'; // Channel to post approved gamertags (leave empty to disable)
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
// Store denied users (userId -> timestamp when they were denied, indefinite block)
let deniedUsers = new Map();

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

// Extract gamertag and platform from message
// Returns { gamertag: string, platform: 'Java' | 'Bedrock' } or null
function extractGamertag(content) {
    const trimmed = content.trim();
    console.log(`   [EXTRACT] Trying to extract from: "${trimmed}" (length: ${trimmed.length})`);
    
    // Check for platform keywords (case-insensitive)
    let platform = null;
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed.includes('java')) {
        platform = 'Java';
        console.log(`   [EXTRACT] 🎮 Detected platform: Java`);
    } else if (lowerTrimmed.includes('bedrock')) {
        platform = 'Bedrock';
        console.log(`   [EXTRACT] 🎮 Detected platform: Bedrock`);
    }
    
    // If no platform detected, return null (user needs to specify)
    if (!platform) {
        console.log(`   [EXTRACT] ❌ No platform detected (need 'Java' or 'Bedrock')`);
        return null;
    }
    
    // Remove the platform keyword from the end (only split by spaces/dashes before platform)
    // This preserves underscores within the gamertag
    const platformRegex = new RegExp(`\\s*${platform}\\s*$`, 'i');
    const withoutPlatform = trimmed.replace(platformRegex, '').trim();
    
    console.log(`   [EXTRACT] After removing platform: "${withoutPlatform}"`);
    
    if (!withoutPlatform) {
        console.log(`   [EXTRACT] ❌ No gamertag found after removing platform`);
        return null;
    }
    
    // Split only by spaces and dashes (not underscores) to preserve gamertag structure
    const parts = withoutPlatform.split(/[\s\-]+/).filter(p => p.length > 0);
    console.log(`   [EXTRACT] Split parts (preserving underscores):`, parts);
    
    // Join all parts with underscore (in case user used spaces/dashes as separators)
    const gamertag = parts.join('_');
    
    // Validate: only alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(gamertag)) {
        console.log(`   [EXTRACT] ❌ Gamertag contains invalid characters: "${gamertag}"`);
        return null;
    }
    
    // Validate final gamertag length (2-16 characters, Minecraft limit)
    if (gamertag.length < 2 || gamertag.length > 16) {
        console.log(`   [EXTRACT] ❌ Gamertag length invalid: "${gamertag}" (must be 2-16 chars)`);
        return null;
    }
    
    console.log(`   [EXTRACT] ✅ Found valid gamertag: "${gamertag}" | Platform: ${platform}`);
    return { gamertag, platform };
}

// Create confirmation embed
function createConfirmationEmbed(gamertag, platform, user) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('✅ Whitelist Request Received')
        .setDescription(`Your whitelist request is being processed!`)
        .addFields(
            { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\``, inline: true },
            { name: '💻 Platform', value: `\`${platform}\``, inline: true },
            { name: '👤 Discord User', value: `${user.username}#${user.discriminator || '0'}` },
            { name: '⏳ Status', value: 'Waiting for staff confirmation' }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Please wait while staff reviews your request' })
        .setTimestamp();
}

// Create admin notification embed with buttons
function createAdminNotificationEmbed(gamertag, platform, user, userId) {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔔 New Whitelist Request')
        .setDescription(`A user has requested to be whitelisted!`)
        .addFields(
            { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\``, inline: true },
            { name: '💻 Platform', value: `\`${platform}\``, inline: true },
            { name: '👤 Discord Username', value: `${user.username}` },
            { name: '🆔 User ID', value: `\`${userId}\`` },
            { name: '🖼️ Avatar URL', value: `[Click Here](${user.displayAvatarURL({ dynamic: true })})`  },
            { name: '⏰ Requested At', value: new Date().toLocaleString() }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor('#00FF00');
}

// Create accept/deny buttons
function createDecisionButtons(gamertag, platform) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`whitelist_accept_${gamertag}_${platform}`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`whitelist_deny_${gamertag}_${platform}`)
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

// Create guidance embed for users who didn't specify platform
function createGuidanceEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('📋 Whitelist Format Guide')
        .setDescription('Please include your Minecraft platform when submitting your gamertag!')
        .addFields(
            { 
                name: '✅ Valid Formats', 
                value: '`username Java`\n`username Bedrock`\n`username-Java`\n`username-Bedrock`\n`username_Java`', 
                inline: false 
            },
            { 
                name: '❌ Invalid Format', 
                value: '`username` (missing platform)\n`username Xbox`\n`username PlayStation`', 
                inline: false 
            },
            { 
                name: '💡 Examples', 
                value: '• `Steve Java` → For Java Edition\n• `Alex Bedrock` → For Bedrock Edition\n• `Player_123-Java` → Also works!', 
                inline: false 
            }
        )
        .setFooter({ text: 'Reply with the correct format to proceed' })
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

// Export utility functions for admin commands
function resetUserWhitelist(userId) {
    try {
        // Clear the user's cooldown
        const hadCooldown = userCooldowns.has(userId);
        userCooldowns.delete(userId);

        // Find and remove pending requests from this user
        const clearedGamertags = [];
        for (const [gamertag, requestData] of pendingRequests.entries()) {
            if (requestData.userId === userId) {
                clearedGamertags.push(gamertag);
                pendingRequests.delete(gamertag);
            }
        }

        // Save updated requests to file
        saveRequests();

        return {
            success: true,
            message: `Reset successful for user ${userId}`,
            cooldownCleared: hadCooldown,
            cleared: clearedGamertags
        };
    } catch (error) {
        console.error('Error resetting user whitelist:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
            cleared: []
        };
    }
}

function clearUserCooldown(userId) {
    const hadCooldown = userCooldowns.has(userId);
    userCooldowns.delete(userId);
    console.log(`⏱️ Cooldown cleared for user ${userId}`);
    return hadCooldown;
}

function getUserCooldownStatus(userId) {
    const isOnCooldown = userCooldowns.has(userId);
    const remainingMs = getRemainingCooldown(userId);
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const remaining = `${hours}h ${minutes}m`;

    return {
        onCooldown: isOnCooldown,
        remainingMs,
        remaining: isOnCooldown ? remaining : 'No cooldown'
    };
}

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
            if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                if (!ALLOW_ADMIN_REQUESTS) {
                    console.log(`[WHITELIST] Ignoring admin message (ALLOW_ADMIN_REQUESTS = false)`);
                    return;
                }
                console.log(`[WHITELIST] ✅ Admin message allowed (ALLOW_ADMIN_REQUESTS = true)`);
            }
            
            console.log(`[WHITELIST] ✅ Not admin or admin requests allowed - continuing...`);

            const content = message.content.trim();
            console.log(`[WHITELIST] Content to process: "${content}"`);
            const extractedData = extractGamertag(content);
            
            // Debug: Log extraction result
            console.log(`🔍 Content: "${content}" | Extracted data:`, extractedData);

            // If no valid gamertag format detected, show guidance
            if (!extractedData) {
                console.log(`❌ No valid gamertag with platform found - showing guidance`);
                const guidanceEmbed = createGuidanceEmbed();
                const guidanceReply = await message.reply({ 
                    embeds: [guidanceEmbed], 
                    flags: 64 // Ephemeral
                });

                // Delete both messages after 30 seconds
                setTimeout(() => {
                    message.delete().catch(() => {});
                    guidanceReply.delete().catch(() => {});
                }, 30000);
                return;
            }
            
            const { gamertag, platform } = extractedData;
            console.log(`✅ Valid gamertag found! Tag: ${gamertag} | Platform: ${platform}`);

            const userId = message.author.id;

            // Check if user is denied (blocked from requesting)
            if (deniedUsers.has(userId)) {
                const deniedEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Request Blocked')
                    .setDescription(`Your whitelist request has been **DENIED** and you are blocked from reapplying.`)
                    .addFields(
                        { name: '📋 Reason', value: 'Your previous request did not meet our requirements' },
                        { name: '📞 Contact Staff', value: 'If you believe this is a mistake, please contact staff directly' }
                    )
                    .setFooter({ text: 'You cannot submit new requests at this time' })
                    .setTimestamp();

                const reply = await message.reply({ 
                    embeds: [deniedEmbed], 
                    flags: 64 // Ephemeral
                });

                // Delete both the user's message and the bot's reply after 5 seconds
                setTimeout(() => {
                    message.delete().catch(() => {});
                    reply.delete().catch(() => {});
                }, 5000);
                return;
            }

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
                platform,
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
                        .setCustomId(`whitelist_confirm_${gamertag}_${platform}_${userId}`)
                        .setLabel('✅ Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`whitelist_cancel_${gamertag}_${platform}_${userId}`)
                        .setLabel('❌ Cancel/Edit')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Send confirmation to user (ephemeral with buttons)
            const confirmEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✅ Confirm Your Whitelist Request')
                .setDescription(`Please verify your Minecraft details:`)
                .addFields(
                    { name: '🎮 Minecraft Gamertag', value: `\`${gamertag}\``, inline: true },
                    { name: '💻 Platform', value: `\`${platform}\``, inline: true },
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
        // Format: whitelist_confirm_{gamertag}_{platform}_{userId}
        const userId = parts[parts.length - 1]; // Last part is userId
        const platform = parts[parts.length - 2]; // Second to last is platform
        const gamertag = parts.slice(2, -2).join('_'); // Everything between confirm and platform
        
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
                    const adminEmbed = createAdminNotificationEmbed(gamertag, platform, interaction.user, userId);
                    const buttons = createDecisionButtons(gamertag, platform);

                    const adminMessage = await staffChannel.send({
                        content: `<@&${STAFF_ROLE_ID}>`, // Mention staff role
                        embeds: [adminEmbed],
                        components: [buttons]
                    });

                    // Store admin message ID
                    finalRequestData.adminMessageId = adminMessage.id;
                    pendingRequests.set(gamertag, finalRequestData);
                    saveRequests();

                    console.log(`✅ Whitelist request CONFIRMED from ${interaction.user.username} for gamertag: ${gamertag} (${platform})`);
                }
            } catch (error) {
                console.error('❌ Error sending staff notification:', error);
            }

            // Update user's confirmation message
            const submittedEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✅ Request Submitted')
                .setDescription('Your whitelist request has been submitted! Staff will review it soon.')
                .setFooter({ text: 'Please wait for staff response' })
                .setTimestamp();

            await interaction.update({
                embeds: [submittedEmbed],
                components: [],
            }).catch(() => {});

            // Auto-delete the confirmation message after 10 seconds
            setTimeout(() => {
                interaction.message?.delete().catch(() => {});
            }, 10000);

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
        // Format: whitelist_cancel_{gamertag}_{platform}_{userId}
        const userId = parts[parts.length - 1]; // Last part is userId
        const platform = parts[parts.length - 2]; // Second to last is platform
        const gamertag = parts.slice(2, -2).join('_'); // Everything between cancel and platform
        
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
        const parts = customId.replace('whitelist_accept_', '').split('_');
        // Format: {gamertag}_{platform}
        const platform = parts[parts.length - 1]; // Last part is platform
        const gamertag = parts.slice(0, -1).join('_'); // Everything before platform
        
        const requestData = pendingRequests.get(gamertag);

        if (!requestData) {
            try {
                await interaction.deferReply({ ephemeral: true });
                await interaction.editReply({ content: '❌ Request not found or already processed!' });
            } catch (e) {
                console.error('Could not respond to expired interaction:', e.code);
            }
            return;
        }

        try {
            // IMPORTANT: Defer IMMEDIATELY - must happen within 3 seconds
            await interaction.deferReply();
            
            // Immediately remove buttons from the admin message (don't wait for background work)
            try {
                const message = interaction.message;
                const currentEmbeds = message.embeds || [];
                await message.edit({
                    embeds: currentEmbeds,
                    components: [] // Remove buttons IMMEDIATELY
                });
            } catch (btnError) {
                console.log('⚠️ Could not remove buttons:', btnError.code);
            }
            
            // Do heavy work in background while Discord has acknowledged the interaction
            (async () => {
                try {
                    const user = await client.users.fetch(requestData.userId);
                    const member = await interaction.guild.members.fetch(requestData.userId);
                    
                    // Set nickname to ᴍɪʟᴋ - {gamertag} | {platform}
                    const newNickname = `ᴍɪʟᴋ - ${gamertag} | ${platform}`;
                    try {
                        await member.setNickname(newNickname);
                        console.log(`✅ Set nickname for ${user.username} to: ${newNickname}`);
                    } catch (err) {
                        console.error(`❌ Could not set nickname for ${user.username}:`, err.message);
                    }

                    // Assign approved role if configured
                    if (APPROVED_ROLE_ID) {
                        try {
                            await member.roles.add(APPROVED_ROLE_ID);
                            console.log(`✅ Assigned approved role to ${user.username}`);
                        } catch (err) {
                            console.error(`❌ Could not assign role to ${user.username}:`, err.message);
                        }
                    }

                    // Send gamertag to content channel if configured
                    if (CONTENT_CHANNEL_ID) {
                        try {
                            const contentChannel = await interaction.guild.channels.fetch(CONTENT_CHANNEL_ID);
                            if (contentChannel?.isTextBased()) {
                                // Add dot prefix for Bedrock gamertags
                                const gamertagToPost = platform === 'Bedrock' ? `.${gamertag}` : gamertag;
                                await contentChannel.send(`${gamertagToPost}`);
                                console.log(`✅ Posted gamertag to content channel: ${gamertagToPost}`);
                            }
                        } catch (err) {
                            console.error(`❌ Could not post to content channel:`, err.message);
                        }
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
                                await whitelistChannel.send(`<@${requestData.userId}>`);
                                const approvalMentionEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('✅ Whitelist Approved')
                                    .setDescription(`Your whitelist request for **${gamertag}** has been **APPROVED**! Welcome to the server!`)
                                    .setTimestamp();
                                await whitelistChannel.send({
                                    embeds: [approvalMentionEmbed]
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
                        .addFields(
                            { name: 'Approved by', value: `${interaction.user.username}` }
                        )
                        .setFooter({ text: `Approved by ${interaction.user.username}` })
                        .setTimestamp();

                    try {
                        // Get the current embeds and add the approval note
                        const currentEmbeds = interaction.message.embeds || [];
                        await interaction.message.edit({
                            embeds: [...currentEmbeds, approvalNote],
                            components: [] // Remove buttons again
                        });
                        
                        // Delete the processing message after showing approval
                        setTimeout(() => {
                            interaction.deleteReply().catch(() => {});
                        }, 2000);
                    } catch (updateError) {
                        console.log('⚠️ Could not update message with approval note:', updateError.code);
                    }

                    // Remove from pending
                    pendingRequests.delete(gamertag);
                    saveRequests();

                    console.log(`✅ Whitelist approved for ${gamertag} by ${interaction.user.username}`);
                } catch (error) {
                    console.error('❌ Error in background whitelist approval:', error);
                }
            })(); // Execute IIFE immediately without awaiting
            
            // Send immediate confirmation that request is being processed
            const processingEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⏳ Processing')
                .setDescription('Processing whitelist approval...')
                .setFooter({ text: 'Please wait' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [processingEmbed] });

        } catch (error) {
            console.error('❌ Error deferring whitelist approval:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: '❌ Error approving request!',
                        flags: 64 // Ephemeral
                    });
                }
            } catch (e) {
                console.error('Could not send error response:', e.code);
            }
        }
    }

    // Handle deny button
    if (customId.startsWith('whitelist_deny_')) {
        const parts = customId.replace('whitelist_deny_', '').split('_');
        // Format: {gamertag}_{platform}
        const platform = parts[parts.length - 1]; // Last part is platform
        const gamertag = parts.slice(0, -1).join('_'); // Everything before platform
        
        const requestData = pendingRequests.get(gamertag);

        if (!requestData) {
            try {
                await interaction.deferReply({ ephemeral: true });
                await interaction.editReply({ content: '❌ Request not found or already processed!' });
            } catch (e) {
                console.error('Could not respond to expired interaction:', e.code);
            }
            return;
        }

        try {
            // IMPORTANT: Defer IMMEDIATELY - must happen within 3 seconds
            await interaction.deferReply();
            
            // Immediately remove buttons from the admin message (don't wait for background work)
            try {
                const message = interaction.message;
                const currentEmbeds = message.embeds || [];
                await message.edit({
                    embeds: currentEmbeds,
                    components: [] // Remove buttons IMMEDIATELY
                });
            } catch (btnError) {
                console.log('⚠️ Could not remove buttons:', btnError.code);
            }
            
            // Do heavy work in background while Discord has acknowledged the interaction
            (async () => {
                try {
                    const user = await client.users.fetch(requestData.userId);
                    
                    // Add user to denied list (permanent block from reapplying)
                    deniedUsers.set(requestData.userId, new Date().toISOString());
                    console.log(`🚫 User ${user.username} (${requestData.userId}) added to denied list`);
                    
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
                                await whitelistChannel.send(`<@${requestData.userId}>`);
                                const denialMentionEmbed = new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('❌ Whitelist Denied')
                                    .setDescription(`Your whitelist request for **${gamertag}** has been **DENIED**. Please contact staff for more information.`)
                                    .setTimestamp();
                                await whitelistChannel.send({
                                    embeds: [denialMentionEmbed]
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
                        .addFields(
                            { name: 'Denied by', value: `${interaction.user.username}` }
                        )
                        .setFooter({ text: `Denied by ${interaction.user.username}` })
                        .setTimestamp();

                    try {
                        // Get the current embeds and add the denial note
                        const currentEmbeds = interaction.message.embeds || [];
                        await interaction.message.edit({
                            embeds: [...currentEmbeds, denialNote],
                            components: [] // Remove buttons again
                        });
                        
                        // Delete the processing message after showing denial
                        setTimeout(() => {
                            interaction.deleteReply().catch(() => {});
                        }, 2000);
                    } catch (updateError) {
                        console.log('⚠️ Could not update message with denial note:', updateError.code);
                    }

                    // Remove from pending
                    pendingRequests.delete(gamertag);
                    saveRequests();

                    // Do NOT reset cooldown - user is now denied permanently and cannot reapply

                    console.log(`❌ Whitelist denied for ${gamertag} by ${interaction.user.username}`);
                } catch (error) {
                    console.error('❌ Error in background whitelist denial:', error);
                }
            })(); // Execute IIFE immediately without awaiting
            
            // Send immediate confirmation that request is being processed
            const processingEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⏳ Processing')
                .setDescription('Processing whitelist denial...')
                .setFooter({ text: 'Please wait' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [processingEmbed] });

        } catch (error) {
            console.error('❌ Error deferring whitelist denial:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: '❌ Error denying request!',
                        flags: 64 // Ephemeral
                    });
                }
            } catch (e) {
                console.error('Could not send error response:', e.code);
            }
        }
    }
};

// Export utility functions for admin commands
module.exports.resetUserWhitelist = resetUserWhitelist;
module.exports.clearUserCooldown = clearUserCooldown;
module.exports.getUserCooldownStatus = getUserCooldownStatus;
