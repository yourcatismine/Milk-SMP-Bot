// events/Ticket.js
const { writeFileSync, readFileSync, existsSync } = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'Ticket',
  /**
   * @param {import('discord.js').Client} client
   * @param {string} menuChannelId     // where dropdown is posted
   * @param {string} ticketCategoryId  // parent category
   * @param {Array<string>} claimRoles // role IDs allowed to claim
   * @param {Array<string>} closeRoles // role IDs allowed to close
   * @param {string} title
   * @param {string} description
   * @param {number} intervalMs
   */
  async execute(client, menuChannelId, ticketCategoryId, claimRoles, closeRoles, title, description, intervalMs = 3600000) {
    const jsonFile = path.join(__dirname, 'lastTicket.json');
    const ticketsFile = path.join(__dirname, 'activeTickets.json');
    const data = existsSync(jsonFile) ? JSON.parse(readFileSync(jsonFile, 'utf8')) : {};
    const activeTickets = existsSync(ticketsFile) ? JSON.parse(readFileSync(ticketsFile, 'utf8')) : {};

    // Function to save active tickets data
    const saveTicketsData = () => {
      writeFileSync(ticketsFile, JSON.stringify(activeTickets, null, 2));
    };

    // Function to restore inactivity tracking for existing tickets
    const restoreInactivityTracking = async () => {
      const botStartTime = Date.now();
      
      for (const [channelId, ticketData] of Object.entries(activeTickets)) {
        try {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel) {
            // Channel doesn't exist anymore, remove from active tickets
            delete activeTickets[channelId];
            saveTicketsData();
            continue;
          }

          const { userId, lastActivity, claimRoles: savedClaimRoles, closeRoles: savedCloseRoles, category } = ticketData;
          let inactivityAlertSent = !!ticketData.alertMessageId;
          let ticketClosed = false;

          // PAUSE FEATURE: Reset last activity to bot start time to pause timers
          activeTickets[channelId].lastActivity = botStartTime;
          saveTicketsData();

          // Function to update activity for this ticket
          const updateActivity = async () => {
            activeTickets[channelId].lastActivity = Date.now();
            
            // Delete alert message if it exists
            if (activeTickets[channelId].alertMessageId) {
              try {
                const alertMsg = await channel.messages.fetch(activeTickets[channelId].alertMessageId);
                await alertMsg.delete();
                activeTickets[channelId].alertMessageId = null;
              } catch (error) {
                console.error('Failed to delete alert message:', error);
              }
            }
            
            saveTicketsData();
            inactivityAlertSent = false;
          };

          // Message listener for this specific ticket
          const messageListener = (message) => {
            if (message.channel.id === channelId && !message.author.bot) {
              updateActivity();
            }
          };

          client.on('messageCreate', messageListener);

          // Restore inactivity checker
          const inactivityInterval = setInterval(async () => {
            if (ticketClosed) {
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              delete activeTickets[channelId];
              saveTicketsData();
              return;
            }

            const currentLastActivity = activeTickets[channelId]?.lastActivity || Date.now();
            const timeSinceLastActivity = Date.now() - currentLastActivity;
            const alertTime = 10 * 1000; // 10 seconds //1 hour: 60 * 60 * 1000
            const deleteTime = 20 * 1000; // 20 seconds //1 hour: 60 * 60 * 1000

            // Send inactivity alert
            if (timeSinceLastActivity >= alertTime && !inactivityAlertSent) {
              inactivityAlertSent = true;
              const deleteTimestamp = Math.floor((Date.now() + (deleteTime - alertTime)) / 1000);
              
              const inactivityEmbed = new EmbedBuilder()
                .setTitle('⚠️ Ticket Inactivity Alert')
                .setDescription(`This ticket has been inactive for too long and will be automatically closed soon.`)
                .addFields(
                  { name: '⏰ Automatic Closure', value: `<t:${deleteTimestamp}:R>`, inline: true },
                  { name: '💬 Keep Open', value: 'Send any message', inline: true },
                  { name: '📋 Category', value: (category || 'Unknown').replace(/_/g, ' '), inline: true }
                )
                .setColor(0xFF6B00)
                .setTimestamp()
                .setFooter({ text: 'Ticket System • Send a message to prevent closure' });

              try {
                const alertMessage = await channel.send({ content: `<@${userId}>`, embeds: [inactivityEmbed] });
                activeTickets[channelId].alertMessageId = alertMessage.id;
                saveTicketsData();
              } catch (error) {
                console.error('Failed to send inactivity alert:', error);
              }
            }

            // Auto-close ticket
            if (timeSinceLastActivity >= deleteTime && inactivityAlertSent) {
              ticketClosed = true;
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              delete activeTickets[channelId];
              saveTicketsData();

              // Send DM to ticket creator about auto-close
              try {
                const ticketUser = await client.users.fetch(userId);
                const autoCloseEmbed = new EmbedBuilder()
                  .setTitle('⏰ Ticket Auto-Closed')
                  .setDescription(`Your ticket was automatically closed due to inactivity.`)
                  .addFields(
                    { name: '📍 Channel', value: `#${channel.name}`, inline: true },
                    { name: '⚠️ Reason', value: 'Inactivity Timeout', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                  )
                  .setColor(0xFF6B00)
                  .setTimestamp()
                  .setFooter({ text: 'You can create a new ticket anytime if needed!' });

                await ticketUser.send({ embeds: [autoCloseEmbed] });
              } catch (error) {
                // Ignore DM errors (user has DMs disabled or blocked bot)
                if (error.code !== 50007) {
                  console.error('Failed to send auto-close DM:', error);
                }
              }

              try {
                const closeEmbed = new EmbedBuilder()
                  .setTitle('🔒 Ticket Auto-Closed')
                  .setDescription('This ticket was automatically closed due to inactivity.')
                  .addFields(
                    { name: '⚠️ Reason', value: 'No activity detected', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🎫 Create New', value: 'Use the ticket menu', inline: true }
                  )
                  .setColor(0xFF0000)
                  .setTimestamp()
                  .setFooter({ text: 'Ticket System • Thank you for using our support' });

                await channel.send({ embeds: [closeEmbed] });
                
                setTimeout(() => {
                  channel.delete().catch(() => {});
                }, 3000);
              } catch (error) {
                console.error('Failed to auto-close ticket:', error);
              }
            }
          }, 5000);

          // Store interval reference for cleanup
          activeTickets[channelId].inactivityInterval = inactivityInterval;
          activeTickets[channelId].messageListener = messageListener;

        } catch (error) {
          console.error(`Error restoring ticket ${channelId}:`, error);
          delete activeTickets[channelId];
          saveTicketsData();
        }
      }
    };

    // Restore tracking for existing tickets on startup
    await restoreInactivityTracking();

    async function sendMenu() {
      if (data[menuChannelId]) {
        try {
          const ch = await client.channels.fetch(menuChannelId);
          const old = await ch.messages.fetch(data[menuChannelId]);
          await old.delete();
        } catch {}
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x00AAFF)
        .setTimestamp();

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket-menu')
        .setPlaceholder('Select a category…')
        .addOptions([
          { label: 'Ask Questions', value: 'question', emoji: '❓' },
          { label: 'Partnership', value: 'partner', emoji: '🤝' },
          { label: 'Report A Bug', value: 'bug', emoji: '🐞' },
          { label: 'Report A Player', value: 'player', emoji: '⚠️' },
          { label: 'Others', value: 'other', emoji: '💬' },
        ]);

      const row = new ActionRowBuilder().addComponents(menu);
      const ch = await client.channels.fetch(menuChannelId);
      const sent = await ch.send({ embeds: [embed], components: [row] });

      data[menuChannelId] = sent.id;
      writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    }

    // Global interaction handler for both dropdown and buttons
    client.on('interactionCreate', async interaction => {
      // Handle dropdown menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-menu') {
        const sel = interaction.values[0];
        const uname = interaction.user.username.replace(/\s+/g, '-').toLowerCase();
        const chanName = `${sel}-${uname}`;

        const guild = interaction.guild;
        const everyone = guild.roles.everyone;

        try {
          const ticketChan = await guild.channels.create({
            name: chanName,
            type: ChannelType.GuildText,
            parent: ticketCategoryId,
            permissionOverwrites: [
              { id: everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            ]
          });

          // Build buttons
          const claimBtn = new ButtonBuilder()
            .setCustomId('ticket-claim')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Success);

          const closeBtn = new ButtonBuilder()
            .setCustomId('ticket-close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger);

          const btnRow = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

          // Send ticket message
          const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket: ${sel.replace(/_/g, ' ')}`)
            .setDescription(`Thank you for opening a ticket, ${interaction.user}!\n\n**Instructions:**\n• Explain your issue clearly\n• Staff will assist you shortly\n• Use the buttons below for staff actions`)
            .addFields(
              { name: '📋 Category', value: sel.replace(/_/g, ' '), inline: true },
              { name: '👤 Created By', value: interaction.user.toString(), inline: true },
              { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Staff will respond soon' });

          await ticketChan.send({ embeds: [ticketEmbed], components: [btnRow] });

          // REPLY FIRST to prevent interaction timeout
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Ticket Created Successfully!')
            .setDescription(`Your ticket has been created in ${ticketChan}`)
            .addFields(
              { name: '📋 Category', value: sel.replace(/_/g, ' '), inline: true },
              { name: '📍 Channel', value: ticketChan.toString(), inline: true },
              { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: 'Click the channel to view your ticket' });

          await interaction.reply({ embeds: [successEmbed], ephemeral: true });

          // Save ticket data to JSON
          activeTickets[ticketChan.id] = {
            channelId: ticketChan.id,
            userId: interaction.user.id,
            username: interaction.user.username,
            category: sel,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            claimRoles: claimRoles,
            closeRoles: closeRoles,
            menuChannelId: menuChannelId,
            ticketCategoryId: ticketCategoryId,
            alertMessageId: null
          };
          saveTicketsData();

          // Start inactivity tracking
          let lastActivity = Date.now();
          let inactivityAlertSent = false;
          let ticketClosed = false;

          // Function to update last activity
          const updateActivity = async () => {
            lastActivity = Date.now();
            activeTickets[ticketChan.id].lastActivity = lastActivity;
            
            // Delete alert message if it exists
            if (activeTickets[ticketChan.id].alertMessageId) {
              try {
                const alertMsg = await ticketChan.messages.fetch(activeTickets[ticketChan.id].alertMessageId);
                await alertMsg.delete();
                activeTickets[ticketChan.id].alertMessageId = null;
              } catch (error) {
                console.error('Failed to delete alert message:', error);
              }
            }
            
            saveTicketsData();
            inactivityAlertSent = false;
          };

          // Listen for messages in the ticket channel to track activity
          const messageListener = (message) => {
            if (message.channel.id === ticketChan.id && !message.author.bot) {
              updateActivity();
            }
          };

          client.on('messageCreate', messageListener);

          // Inactivity checker - runs every 5 seconds
          const inactivityInterval = setInterval(async () => {
            if (ticketClosed) {
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              delete activeTickets[ticketChan.id];
              saveTicketsData();
              return;
            }

            const currentLastActivity = activeTickets[ticketChan.id]?.lastActivity || lastActivity;
            const timeSinceLastActivity = Date.now() - currentLastActivity;
            const alertTime = 10 * 1000; // 10 seconds //1 hour: 60 * 60 * 1000
            const deleteTime = 20 * 1000; // 20 seconds //1 hour: 60 * 60 * 1000

            // Send inactivity alert
            if (timeSinceLastActivity >= alertTime && !inactivityAlertSent) {
              inactivityAlertSent = true;
              const deleteTimestamp = Math.floor((Date.now() + (deleteTime - alertTime)) / 1000);
              
              const inactivityEmbed = new EmbedBuilder()
                .setTitle('⚠️ Ticket Inactivity Alert')
                .setDescription(`This ticket has been inactive for too long and will be automatically closed soon.`)
                .addFields(
                  { name: '⏰ Automatic Closure', value: `<t:${deleteTimestamp}:R>`, inline: true },
                  { name: '💬 Keep Open', value: 'Send any message', inline: true },
                  { name: '📍 Channel', value: `#${ticketChan.name}`, inline: true }
                )
                .setColor(0xFF6B00)
                .setTimestamp()
                .setFooter({ text: 'Ticket System • Send a message to prevent closure' });

              try {
                const alertMessage = await ticketChan.send({ content: `${interaction.user}`, embeds: [inactivityEmbed] });
                activeTickets[ticketChan.id].alertMessageId = alertMessage.id;
                saveTicketsData();
              } catch (error) {
                console.error('Failed to send inactivity alert:', error);
              }
            }

            // Auto-close ticket
            if (timeSinceLastActivity >= deleteTime && inactivityAlertSent) {
              ticketClosed = true;
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              delete activeTickets[ticketChan.id];
              saveTicketsData();

              // Send DM to ticket creator about auto-close
              try {
                const ticketUser = await client.users.fetch(interaction.user.id);
                const autoCloseEmbed = new EmbedBuilder()
                  .setTitle('⏰ Ticket Auto-Closed')
                  .setDescription(`Your ticket **${sel.replace(/_/g, ' ')}** was automatically closed due to inactivity.`)
                  .addFields(
                    { name: '📋 Ticket Category', value: sel.replace(/_/g, ' '), inline: true },
                    { name: '⚠️ Reason', value: 'Inactivity Timeout', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                  )
                  .setColor(0xFF6B00)
                  .setTimestamp()
                  .setFooter({ text: 'You can create a new ticket anytime if needed!' });

                await ticketUser.send({ embeds: [autoCloseEmbed] });
              } catch (error) {
                // Ignore DM errors (user has DMs disabled or blocked bot)
                if (error.code !== 50007) {
                  console.error('Failed to send auto-close DM:', error);
                }
              }

              try {
                const closeEmbed = new EmbedBuilder()
                  .setTitle('🔒 Ticket Auto-Closed')
                  .setDescription('This ticket was automatically closed due to inactivity.')
                  .addFields(
                    { name: '⚠️ Reason', value: 'No activity detected', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🎫 Create New', value: 'Use the ticket menu', inline: true }
                  )
                  .setColor(0xFF0000)
                  .setTimestamp()
                  .setFooter({ text: 'Ticket System • Thank you for using our support' });

                const finalMessage = await ticketChan.send({ embeds: [closeEmbed] });
                
                setTimeout(() => {
                  ticketChan.delete().catch(() => {});
                }, 3000);
              } catch (error) {
                console.error('Failed to auto-close ticket:', error);
              }
            }
          }, 5000);

        } catch (error) {
          console.error('Error creating ticket:', error);
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ticket Creation Failed')
            .setDescription('Sorry, we encountered an error while creating your ticket.')
            .addFields(
              { name: '🔄 Try Again', value: 'Please select a category again', inline: true },
              { name: '🆘 Still Issues?', value: 'Contact an administrator', inline: true },
              { name: '⏰ Error Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Error occurred' });

          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }

      // Handle claim/close buttons
      if (interaction.isButton() && interaction.customId.startsWith('ticket-')) {
        const ticketData = activeTickets[interaction.channel.id];
        if (!ticketData) return; // Not a tracked ticket

        const userRoles = interaction.member.roles.cache;
        const isClaim = interaction.customId === 'ticket-claim';
        const required = isClaim ? ticketData.claimRoles : ticketData.closeRoles;
        
        const hasPermission = userRoles.some(role => required.includes(role.id));
        
        if (!hasPermission) {
          const noPermEmbed = new EmbedBuilder()
            .setTitle('❌ Access Denied')
            .setDescription('You don\'t have permission to perform this action.')
            .addFields(
              { name: '🔐 Required', value: 'Staff role needed', inline: true },
              { name: '📞 Need Help?', value: 'Contact an administrator', inline: true },
              { name: '🎫 Your Ticket', value: 'Wait for staff response', inline: true }
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Permission denied' });

          return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        if (interaction.customId === 'ticket-claim') {
          // Update activity and delete alert if exists
          if (activeTickets[interaction.channel.id].alertMessageId) {
            try {
              const alertMsg = await interaction.channel.messages.fetch(activeTickets[interaction.channel.id].alertMessageId);
              await alertMsg.delete();
              activeTickets[interaction.channel.id].alertMessageId = null;
            } catch (error) {
              console.error('Failed to delete alert message:', error);
            }
          }
          
          activeTickets[interaction.channel.id].lastActivity = Date.now();
          saveTicketsData();
          
          const claimSuccessEmbed = new EmbedBuilder()
            .setTitle('✋ Ticket Claimed!')
            .setDescription(`${interaction.user} has claimed this ticket and will assist you.`)
            .addFields(
              { name: '👤 Staff Member', value: interaction.user.toString(), inline: true },
              { name: '⏰ Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: '📋 Status', value: 'Being handled', inline: true }
            )
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Staff member assigned' });

          await interaction.reply({ embeds: [claimSuccessEmbed], ephemeral: false });
          
          // Send DM to ticket creator (only once per claim)
          try {
            const ticketUser = await client.users.fetch(ticketData.userId);
            const claimEmbed = new EmbedBuilder()
              .setTitle('🎫 Ticket Claimed')
              .setDescription(`Your ticket **${ticketData.category.replace(/_/g, ' ')}** has been claimed by ${interaction.user}!`)
              .addFields(
                { name: '📋 Ticket Category', value: ticketData.category.replace(/_/g, ' '), inline: true },
                { name: '👤 Claimed By', value: interaction.user.toString(), inline: true },
                { name: '📍 Channel', value: interaction.channel.toString(), inline: true }
              )
              .setColor(0x00FF00)
              .setTimestamp()
              .setFooter({ text: 'A staff member will assist you shortly!' });

            await ticketUser.send({ embeds: [claimEmbed] });
          } catch (error) {
            // Ignore DM errors (user has DMs disabled or blocked bot)
            if (error.code !== 50007) {
              console.error('Failed to send claim DM:', error);
            }
          }

        } else if (interaction.customId === 'ticket-close') {
          // Send DM to ticket creator before closing
          try {
            const ticketUser = await client.users.fetch(ticketData.userId);
            const closeEmbed = new EmbedBuilder()
              .setTitle('🔒 Ticket Closed')
              .setDescription(`Your ticket **${ticketData.category.replace(/_/g, ' ')}** has been closed by ${interaction.user}.`)
              .addFields(
                { name: '📋 Ticket Category', value: ticketData.category.replace(/_/g, ' '), inline: true },
                { name: '👤 Closed By', value: interaction.user.toString(), inline: true },
                { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
              )
              .setColor(0xFF0000)
              .setTimestamp()
              .setFooter({ text: 'Thank you for using our support system!' });

            await ticketUser.send({ embeds: [closeEmbed] });
          } catch (error) {
            // Ignore DM errors (user has DMs disabled or blocked bot)
            if (error.code !== 50007) {
              console.error('Failed to send close DM:', error);
            }
          }
          
          delete activeTickets[interaction.channel.id];
          saveTicketsData();
          
          const closeSuccessEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closing')
            .setDescription('This ticket is being closed by staff.')
            .addFields(
              { name: '👤 Closed By', value: interaction.user.toString(), inline: true },
              { name: '⏰ Closing In', value: '5 seconds', inline: true },
              { name: '💌 Final Notice', value: 'Check your DMs', inline: true }
            )
            .setColor(0xFF6B00)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Thank you for using our support' });

          await interaction.reply({ embeds: [closeSuccessEmbed], ephemeral: true });

          const publicCloseEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription('This ticket has been closed by staff.')
            .addFields(
              { name: '👤 Closed By', value: interaction.user.toString(), inline: true },
              { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: '🎫 Need Help?', value: 'Create a new ticket', inline: true }
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Channel will be deleted shortly' });

          await interaction.channel.send({ embeds: [publicCloseEmbed] });
          setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
      }
    });

    await sendMenu();
    setInterval(sendMenu, intervalMs);
  }
};