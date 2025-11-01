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
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SelectMenuBuilder
} = require('discord.js');

module.exports = {
  name: 'Ticket',
  
  // Define questions for each ticket type
  getQuestions(ticketType) {
    const questions = {
      question: [
        { id: 'question_title', label: 'What is your question?', placeholder: 'e.g., How do I...', required: true, minLength: 5, maxLength: 100 },
        { id: 'question_details', label: 'Provide more details', placeholder: 'Additional information...', required: true, minLength: 10, maxLength: 4000 }
      ],
      partner: [
        { id: 'partner_name', label: 'Organization/Channel name', placeholder: 'Your name or brand', required: true, minLength: 3, maxLength: 100 },
        { id: 'partner_type', label: 'Type of partnership', placeholder: 'e.g., Sponsorship, Collaboration', required: true, minLength: 5, maxLength: 100 },
        { id: 'partner_details', label: 'Tell us about your proposal', placeholder: 'Details about the partnership...', required: true, minLength: 20, maxLength: 4000 }
      ],
      bug: [
        { id: 'bug_description', label: 'Describe the bug', placeholder: 'What is happening?', required: true, minLength: 10, maxLength: 500 },
        { id: 'bug_steps', label: 'Steps to reproduce', placeholder: '1. First step\n2. Second step...', required: true, minLength: 10, maxLength: 2000 },
        { id: 'bug_expected', label: 'Expected behavior', placeholder: 'What should happen?', required: true, minLength: 10, maxLength: 2000 }
      ],
      player: [
        { id: 'player_username', label: 'Player username', placeholder: 'Username of the player', required: true, minLength: 3, maxLength: 100 },
        { id: 'player_reason', label: 'Reason for report', placeholder: 'What did they do?', required: true, minLength: 10, maxLength: 500 },
        { id: 'player_evidence', label: 'Evidence/Details', placeholder: 'Screenshots, timestamps, etc.', required: true, minLength: 10, maxLength: 2000 }
      ],
      other: [
        { id: 'other_subject', label: 'What is this about?', placeholder: 'Brief subject', required: true, minLength: 5, maxLength: 100 },
        { id: 'other_details', label: 'Details', placeholder: 'Please explain...', required: true, minLength: 10, maxLength: 4000 }
      ]
    };
    return questions[ticketType] || questions.other;
  },

  // Summarize question responses
  summarizeResponses(ticketType, responses) {
    let summary = `**Ticket Type:** ${ticketType.replace(/_/g, ' ').toUpperCase()}\n\n`;
    
    Object.entries(responses).forEach(([key, value]) => {
      const label = key.replace(/_/g, ' ').toUpperCase();
      summary += `**${label}:**\n${value || 'N/A'}\n\n`;
    });
    
    return summary;
  },

  // Format a date to a readable string
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

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
    const ticketHistoryFile = path.join(__dirname, 'ticketHistory.json');
    const data = existsSync(jsonFile) ? JSON.parse(readFileSync(jsonFile, 'utf8')) : {};
    const activeTickets = existsSync(ticketsFile) ? JSON.parse(readFileSync(ticketsFile, 'utf8')) : {};
    const ticketHistory = existsSync(ticketHistoryFile) ? JSON.parse(readFileSync(ticketHistoryFile, 'utf8')) : {};
    
    // Runtime tracking (not persisted - recreated on each run)
    const ticketRuntimes = {}; // Stores intervals, listeners, and other runtime data

    // Function to save active tickets data (with serialization filtering)
    const saveTicketsData = () => {
      // Filter out non-serializable properties like intervals and timeouts
      const serializableTickets = {};
      Object.entries(activeTickets).forEach(([channelId, ticketData]) => {
        serializableTickets[channelId] = {
          channelId: ticketData.channelId,
          userId: ticketData.userId,
          username: ticketData.username,
          category: ticketData.category,
          responses: ticketData.responses,
          createdAt: ticketData.createdAt,
          lastActivity: ticketData.lastActivity,
          claimRoles: ticketData.claimRoles,
          closeRoles: ticketData.closeRoles,
          menuChannelId: ticketData.menuChannelId,
          ticketCategoryId: ticketData.ticketCategoryId,
          alertMessageId: ticketData.alertMessageId,
          alertSentAt: ticketData.alertSentAt,
          claimed: ticketData.claimed,
          claimedBy: ticketData.claimedBy,
          claimedAt: ticketData.claimedAt
        };
      });
      writeFileSync(ticketsFile, JSON.stringify(serializableTickets, null, 2));
    };

    // Function to save ticket history
    const saveTicketHistory = () => {
      writeFileSync(ticketHistoryFile, JSON.stringify(ticketHistory, null, 2));
    };

    // Function to add ticket to history when closed
    const archiveTicket = (ticketId, ticketData, reason = 'closed') => {
      const historyEntry = {
        ticketId: ticketId,
        userId: ticketData.userId,
        username: ticketData.username,
        category: ticketData.category,
        responses: ticketData.responses,
        createdAt: ticketData.createdAt,
        closedAt: Date.now(),
        reason: reason,
        formattedDate: this.formatDate(ticketData.createdAt),
        closedDate: this.formatDate(Date.now()),
        status: reason
      };

      if (!ticketHistory[ticketData.userId]) {
        ticketHistory[ticketData.userId] = [];
      }

      ticketHistory[ticketData.userId].push(historyEntry);
      saveTicketHistory();
    };

    // Function to restore inactivity tracking for existing tickets
    const restoreInactivityTracking = async () => {
      const botStartTime = Date.now();
      
      for (const [channelId, ticketData] of Object.entries(activeTickets)) {
        try {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel) {
            // Channel doesn't exist anymore, archive it
            archiveTicket(channelId, ticketData, 'channel_deleted');
            delete activeTickets[channelId];
            delete ticketRuntimes[channelId];
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
            
            // Delete alert message if it exists and reset alert status
            if (activeTickets[channelId].alertMessageId) {
              try {
                const alertMsg = await channel.messages.fetch(activeTickets[channelId].alertMessageId);
                await alertMsg.delete();
                activeTickets[channelId].alertMessageId = null;
                activeTickets[channelId].alertSentAt = null; // Reset alert timestamp
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
              delete ticketRuntimes[channelId];
              saveTicketsData();
              return;
            }

            const currentLastActivity = activeTickets[channelId]?.lastActivity || Date.now();
            const timeSinceLastActivity = Date.now() - currentLastActivity;
            const alertTime = 60 * 60 * 1000; // 1 hour
            const deleteTime = 2 * 60 * 60 * 1000; // 2 hours total (1 hour after alert)

            // Send inactivity alert after 1 hour
            if (timeSinceLastActivity >= alertTime && !inactivityAlertSent) {
              inactivityAlertSent = true;
              const deleteTimestamp = Math.floor((Date.now() + (deleteTime - alertTime)) / 1000);
              
              const inactivityEmbed = new EmbedBuilder()
                .setTitle('⚠️ Ticket Inactivity Alert')
                .setDescription(`This ticket has been inactive for 1 hour and will be automatically closed in 1 hour if no activity is detected.`)
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
                activeTickets[channelId].alertSentAt = Date.now(); // Track when alert was sent
                saveTicketsData();
              } catch (error) {
                console.error('Failed to send inactivity alert:', error);
              }
            }

            // Auto-close ticket after 2 hours total (1 hour after alert)
            if (timeSinceLastActivity >= deleteTime && inactivityAlertSent) {
              ticketClosed = true;
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              archiveTicket(channelId, activeTickets[channelId], 'inactivity');
              delete activeTickets[channelId];
              delete ticketRuntimes[channelId];
              saveTicketsData();

              // Send DM to ticket creator about auto-close
              try {
                const ticketUser = await client.users.fetch(userId);
                const autoCloseEmbed = new EmbedBuilder()
                  .setTitle('⏰ Ticket Auto-Closed')
                  .setDescription(`Your ticket was automatically closed due to inactivity.`)
                  .addFields(
                    { name: '📍 Channel', value: `#${channel.name}`, inline: true },
                    { name: '⚠️ Reason', value: 'Inactivity Timeout (2 hours)', inline: true },
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
                    { name: '⚠️ Reason', value: 'No activity for 2 hours', inline: true },
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
          if (!ticketRuntimes[channelId]) {
            ticketRuntimes[channelId] = {};
          }
          ticketRuntimes[channelId].inactivityInterval = inactivityInterval;
          ticketRuntimes[channelId].messageListener = messageListener;

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
      // Handle dropdown menu - SHOW MODAL WITH QUESTIONS
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-menu') {
        const ticketType = interaction.values[0];
        const questions = this.getQuestions(ticketType);

        // Create modal with dynamic questions
        const modal = new ModalBuilder()
          .setCustomId(`ticket-modal-${ticketType}`)
          .setTitle(`${ticketType.replace(/_/g, ' ').toUpperCase()} Support`);

        // Add text input fields for each question
        questions.forEach((question, index) => {
          // Determine if it's a short or long input
          const isLongInput = question.label.length > 30 || question.maxLength > 500;
          
          const input = new TextInputBuilder()
            .setCustomId(question.id)
            .setLabel(question.label)
            .setStyle(isLongInput ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setPlaceholder(question.placeholder)
            .setRequired(question.required);

          // Add min/max length constraints if available
          if (question.minLength) input.setMinLength(question.minLength);
          if (question.maxLength) input.setMaxLength(question.maxLength);

          const row = new ActionRowBuilder().addComponents(input);
          modal.addComponents(row);
        });

        await interaction.showModal(modal);
      }

      // Handle modal submission
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket-modal-')) {
        const ticketType = interaction.customId.replace('ticket-modal-', '');
        
        // Collect all responses
        const responses = {};
        interaction.fields.fields.forEach(field => {
          responses[field.customId] = field.value;
        });

        // Acknowledge the interaction
        await interaction.deferReply({ ephemeral: true });

        const uname = interaction.user.username.replace(/\s+/g, '-').toLowerCase();
        const chanName = `${ticketType}-${uname}`;

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
            .setLabel('✋ Claim')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✋');

          const closeBtn = new ButtonBuilder()
            .setCustomId('ticket-close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

          const statusBtn = new ButtonBuilder()
            .setCustomId('ticket-status')
            .setLabel('Status')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊');

          const btnRow = new ActionRowBuilder().addComponents(claimBtn, closeBtn, statusBtn);

          // Create summary of responses
          const summary = this.summarizeResponses(ticketType, responses);

          // Send ticket message with initial embed
          const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 ${ticketType.replace(/_/g, ' ').toUpperCase()} Support Ticket`)
            .setDescription(`Thank you for reaching out, ${interaction.user}!\n\nOur team will assist you shortly.`)
            .addFields(
              { name: '📋 Category', value: `\`${ticketType.replace(/_/g, ' ').toUpperCase()}\``, inline: true },
              { name: '👤 Created By', value: `${interaction.user}`, inline: true },
              { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
              { name: '📊 Status', value: '🔄 Waiting for staff', inline: true },
              { name: '🔐 Priority', value: 'Normal', inline: true }
            )
            .setColor(0x00FF00)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Ticket System • We\'ll respond as soon as possible' });

          await ticketChan.send({ embeds: [ticketEmbed], components: [btnRow] });

          // Send summary as separate message with better formatting
          const summaryEmbed = new EmbedBuilder()
            .setTitle('📝 Your Information')
            .setDescription(summary)
            .setColor(0x0099FF)
            .setTimestamp()
            .setFooter({ text: 'This information was extracted from your responses' });

          await ticketChan.send({ embeds: [summaryEmbed] });

          // REPLY to user with success
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Ticket Created Successfully!')
            .setDescription(`Your support ticket has been created and our staff will respond shortly.`)
            .addFields(
              { name: '📋 Category', value: `\`${ticketType.replace(/_/g, ' ').toUpperCase()}\``, inline: true },
              { name: '📍 Channel', value: ticketChan.toString(), inline: true },
              { name: '⏰ Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
              { name: '💡 Pro Tip', value: 'Check your ticket channel regularly for updates from our staff!', inline: false }
            )
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: 'Click the channel link to view your ticket' });

          await interaction.editReply({ embeds: [successEmbed] });

          // Save ticket data to JSON with all necessary information for persistence
          activeTickets[ticketChan.id] = {
            channelId: ticketChan.id,
            userId: interaction.user.id,
            username: interaction.user.username,
            userTag: interaction.user.tag,
            category: ticketType,
            responses: responses,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            claimRoles: claimRoles,
            closeRoles: closeRoles,
            menuChannelId: menuChannelId,
            ticketCategoryId: ticketCategoryId,
            alertMessageId: null,
            alertSentAt: null,
            claimed: false,
            claimedBy: null,
            claimedAt: null
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
            
            // Delete alert message if it exists and reset alert status
            if (activeTickets[ticketChan.id].alertMessageId) {
              try {
                const alertMsg = await ticketChan.messages.fetch(activeTickets[ticketChan.id].alertMessageId);
                await alertMsg.delete();
                activeTickets[ticketChan.id].alertMessageId = null;
                activeTickets[ticketChan.id].alertSentAt = null; // Reset alert timestamp
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
            const alertTime = 60 * 60 * 1000; // 1 hour
            const deleteTime = 2 * 60 * 60 * 1000; // 2 hours total (1 hour after alert)

            // Send inactivity alert after 1 hour
            if (timeSinceLastActivity >= alertTime && !inactivityAlertSent) {
              inactivityAlertSent = true;
              const deleteTimestamp = Math.floor((Date.now() + (deleteTime - alertTime)) / 1000);
              
              const inactivityEmbed = new EmbedBuilder()
                .setTitle('⚠️ Inactivity Alert')
                .setDescription(`This ticket will be **automatically closed** if there's no activity.`)
                .addFields(
                  { name: '⏰ Auto-Close Time', value: `<t:${deleteTimestamp}:R>`, inline: true },
                  { name: '💬 Prevent Closure', value: 'Send any message', inline: true },
                  { name: '📍 Channel', value: `#${ticketChan.name}`, inline: true }
                )
                .setColor(0xFF6B00)
                .setTimestamp()
                .setFooter({ text: 'Ticket System • Inactivity Warning' });

              try {
                const alertMessage = await ticketChan.send({ content: `${interaction.user}`, embeds: [inactivityEmbed] });
                activeTickets[ticketChan.id].alertMessageId = alertMessage.id;
                activeTickets[ticketChan.id].alertSentAt = Date.now(); // Track when alert was sent
                saveTicketsData();
              } catch (error) {
                console.error('Failed to send inactivity alert:', error);
              }
            }

            // Auto-close ticket after 2 hours total (1 hour after alert)
            if (timeSinceLastActivity >= deleteTime && inactivityAlertSent) {
              ticketClosed = true;
              clearInterval(inactivityInterval);
              client.removeListener('messageCreate', messageListener);
              archiveTicket(ticketChan.id, activeTickets[ticketChan.id], 'inactivity');
              delete activeTickets[ticketChan.id];
              delete ticketRuntimes[ticketChan.id];
              saveTicketsData();

              // Send DM to ticket creator about auto-close
              try {
                const ticketUser = await client.users.fetch(interaction.user.id);
                const autoCloseEmbed = new EmbedBuilder()
                  .setTitle('⏰ Ticket Auto-Closed')
                  .setDescription(`Your **${ticketType.replace(/_/g, ' ')}** ticket was automatically closed due to inactivity.`)
                  .addFields(
                    { name: '📋 Category', value: ticketType.replace(/_/g, ' '), inline: true },
                    { name: '⚠️ Reason', value: 'Inactivity Timeout (2 hours)', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                  )
                  .setColor(0xFF6B00)
                  .setTimestamp()
                  .setFooter({ text: 'You can create a new ticket anytime!' });

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
                    { name: '⚠️ Reason', value: 'No activity for 2 hours', inline: true },
                    { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                  )
                  .setColor(0xFF0000)
                  .setTimestamp()
                  .setFooter({ text: 'Ticket System • Archive & Delete' });

                const finalMessage = await ticketChan.send({ embeds: [closeEmbed] });
                
                setTimeout(() => {
                  ticketChan.delete().catch(() => {});
                }, 3000);
              } catch (error) {
                console.error('Failed to auto-close ticket:', error);
              }
            }
          }, 5000);

          // Store runtime data (intervals and listeners) separately
          if (!ticketRuntimes[ticketChan.id]) {
            ticketRuntimes[ticketChan.id] = {};
          }
          ticketRuntimes[ticketChan.id].inactivityInterval = inactivityInterval;
          ticketRuntimes[ticketChan.id].messageListener = messageListener;

        } catch (error) {
          console.error('Error creating ticket:', error);
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ticket Creation Failed')
            .setDescription('Sorry, we encountered an error while creating your ticket.')
            .addFields(
              { name: '🔄 Try Again', value: 'Use the ticket menu again', inline: true },
              { name: '🆘 Support', value: 'Contact an administrator', inline: true }
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Error occurred' });

          // Use editReply since we already deferred the reply
          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // Handle claim/close/status buttons
      if (interaction.isButton() && interaction.customId.startsWith('ticket-')) {
        const ticketData = activeTickets[interaction.channel.id];
        if (!ticketData) return; // Not a tracked ticket

        // Status button - no permission check needed
        if (interaction.customId === 'ticket-status') {
          const statusEmbed = new EmbedBuilder()
            .setTitle('📊 Ticket Status')
            .setDescription('Current ticket information and details')
            .addFields(
              { name: '🎫 Ticket ID', value: `\`${interaction.channel.id}\``, inline: true },
              { name: '👤 Creator', value: `<@${ticketData.userId}>`, inline: true },
              { name: '📋 Category', value: `\`${ticketData.category.replace(/_/g, ' ').toUpperCase()}\``, inline: true },
              { name: '⏰ Created', value: `<t:${Math.floor(ticketData.createdAt / 1000)}:F>`, inline: true },
              { name: '🔄 Last Activity', value: `<t:${Math.floor(ticketData.lastActivity / 1000)}:R>`, inline: true },
              { name: '📊 Status', value: ticketData.claimed ? `🟢 Claimed by <@${ticketData.claimedBy}>` : '🟡 Unclaimed', inline: true },
              { name: '⏳ Time Elapsed', value: `${Math.floor((Date.now() - ticketData.createdAt) / 60000)} minutes`, inline: true },
              { name: '💾 Data Saved', value: 'Yes - Persisted on bot restart ✓', inline: true }
            )
            .setColor(0x0099FF)
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Real-time Status' });

          return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
        }

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
              { name: '📞 Need Help?', value: 'Contact an administrator', inline: true }
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Permission denied' });

          return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        if (interaction.customId === 'ticket-claim') {
          // Check if already claimed
          if (ticketData.claimed) {
            const alreadyClaimedEmbed = new EmbedBuilder()
              .setTitle('⚠️ Already Claimed')
              .setDescription(`This ticket is already claimed by <@${ticketData.claimedBy}>`)
              .addFields(
                { name: '🕐 Claimed At', value: `<t:${Math.floor(ticketData.claimedAt / 1000)}:F>`, inline: true }
              )
              .setColor(0xFF9900)
              .setTimestamp()
              .setFooter({ text: 'Ticket System • Already assigned' });

            return interaction.reply({ embeds: [alreadyClaimedEmbed], ephemeral: true });
          }

          // Update activity and delete alert if exists
          if (activeTickets[interaction.channel.id].alertMessageId) {
            try {
              const alertMsg = await interaction.channel.messages.fetch(activeTickets[interaction.channel.id].alertMessageId);
              await alertMsg.delete();
              activeTickets[interaction.channel.id].alertMessageId = null;
              activeTickets[interaction.channel.id].alertSentAt = null;
            } catch (error) {
              console.error('Failed to delete alert message:', error);
            }
          }
          
          activeTickets[interaction.channel.id].lastActivity = Date.now();
          activeTickets[interaction.channel.id].claimed = true;
          activeTickets[interaction.channel.id].claimedBy = interaction.user.id;
          activeTickets[interaction.channel.id].claimedAt = Date.now();
          saveTicketsData();
          
          const claimSuccessEmbed = new EmbedBuilder()
            .setTitle('✋ Ticket Claimed!')
            .setDescription(`${interaction.user} has claimed this ticket and will assist you.`)
            .addFields(
              { name: '👤 Staff Member', value: `${interaction.user}`, inline: true },
              { name: '⏰ Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: '📋 Status', value: '🟢 Being Handled', inline: true }
            )
            .setColor(0x00FF00)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Staff member assigned' });

          await interaction.reply({ embeds: [claimSuccessEmbed], ephemeral: false });
          
          // Send DM to ticket creator
          try {
            const ticketUser = await client.users.fetch(ticketData.userId);
            const claimEmbed = new EmbedBuilder()
              .setTitle('🎫 Ticket Claimed')
              .setDescription(`Your **${ticketData.category.replace(/_/g, ' ')}** ticket has been claimed!`)
              .addFields(
                { name: '📋 Category', value: ticketData.category.replace(/_/g, ' '), inline: true },
                { name: '👤 Claimed By', value: `${interaction.user.tag}`, inline: true },
                { name: '⏰ Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
              )
              .setColor(0x00FF00)
              .setTimestamp()
              .setFooter({ text: 'A staff member will assist you shortly!' });

            await ticketUser.send({ embeds: [claimEmbed] });
          } catch (error) {
            if (error.code !== 50007) {
              console.error('Failed to send claim DM:', error);
            }
          }

        } else if (interaction.customId === 'ticket-close') {
          // Archive the ticket to history
          archiveTicket(interaction.channel.id, ticketData, 'staff_closed');
          
          // Send DM to ticket creator before closing
          try {
            const ticketUser = await client.users.fetch(ticketData.userId);
            const closeEmbed = new EmbedBuilder()
              .setTitle('🔒 Ticket Closed')
              .setDescription(`Your **${ticketData.category.replace(/_/g, ' ')}** ticket has been closed by staff.`)
              .addFields(
                { name: '📋 Category', value: ticketData.category.replace(/_/g, ' '), inline: true },
                { name: '👤 Closed By', value: `${interaction.user.tag}`, inline: true },
                { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
              )
              .setColor(0xFF0000)
              .setTimestamp()
              .setFooter({ text: 'Thank you for using our support system!' });

            await ticketUser.send({ embeds: [closeEmbed] });
          } catch (error) {
            if (error.code !== 50007) {
              console.error('Failed to send close DM:', error);
            }
          }
          
          delete activeTickets[interaction.channel.id];
          delete ticketRuntimes[interaction.channel.id];
          saveTicketsData();
          
          const closeSuccessEmbed = new EmbedBuilder()
            .setTitle('🔒 Closing Ticket')
            .setDescription('This ticket is being closed by staff.')
            .addFields(
              { name: '👤 Closed By', value: `${interaction.user}`, inline: true },
              { name: '⏰ Channel Deletion', value: 'In 5 seconds', inline: true },
              { name: '💌 Notice', value: 'Ticket archived to history', inline: true }
            )
            .setColor(0xFF6B00)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Ticket System • Session Closed' });

          await interaction.reply({ embeds: [closeSuccessEmbed], ephemeral: true });

          const publicCloseEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription('This ticket has been closed and archived.')
            .addFields(
              { name: '👤 Closed By', value: `${interaction.user}`, inline: true },
              { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
              { name: '💾 Archived', value: 'Ticket history saved ✓', inline: true }
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