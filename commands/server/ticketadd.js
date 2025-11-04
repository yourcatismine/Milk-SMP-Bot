const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { readFileSync, existsSync, writeFileSync } = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage ticket commands")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a user to your ticket")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The user to add to the ticket")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("close")
        .setDescription("Close the current ticket with an optional reason")
        .addStringOption(option =>
          option
            .setName("reason")
            .setDescription("Reason for closing the ticket")
            .addChoices(
              { name: 'Problem Solved', value: 'Problem Solved' },
              { name: 'Invalid', value: 'Invalid' },
              { name: 'Wrong Ticket', value: 'Wrong Ticket' }
            )
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const ticketsFile = path.join(__dirname, '../../bot/activeTickets.json');
    const activeTickets = existsSync(ticketsFile) ? JSON.parse(readFileSync(ticketsFile, 'utf8')) : {};

    // Check which subcommand is being used
    if (interaction.options.getSubcommand() === 'add') {
      await handleTicketAdd(interaction, activeTickets, ticketsFile);
    } else if (interaction.options.getSubcommand() === 'close') {
      await handleTicketClose(interaction, activeTickets, ticketsFile);
    }
  }
};

async function handleTicketAdd(interaction, activeTickets, ticketsFile) {
  // Defer the reply immediately to prevent timeout
  await interaction.deferReply({ ephemeral: true });

  const userToAdd = interaction.options.getUser('user');
  const ticketChannel = interaction.channel;
  const ticketData = activeTickets[ticketChannel.id];

  // Check if this command is being used in a ticket channel
  if (!ticketData) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Not a Ticket Channel')
      .setDescription('This command can only be used in a ticket channel.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }

  // Check if the user running the command is the ticket creator
  if (interaction.user.id !== ticketData.userId) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Permission Denied')
      .setDescription('Only the ticket creator can add users to this ticket.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }

  // Check if the user to add is a bot
  if (userToAdd.bot) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Cannot Add Bot')
      .setDescription('You cannot add bots to your ticket. Please select a valid user.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }

  // Check if the user is already in the ticket
  try {
    const permissions = ticketChannel.permissionOverwrites.cache.get(userToAdd.id);
    if (permissions && permissions.allow.has(PermissionsBitField.Flags.ViewChannel)) {
      const alreadyAddedEmbed = new EmbedBuilder()
        .setTitle('⚠️ User Already Added')
        .setDescription(`${userToAdd} is already added to this ticket.`)
        .setColor(0xFFAA00)
        .setTimestamp()
        .setFooter({ text: 'Ticket System' });

      return interaction.editReply({ embeds: [alreadyAddedEmbed] });
    }
  } catch (error) {
    console.error('Error checking existing permissions:', error);
  }

  // Add the user to the ticket channel
  try {
    await ticketChannel.permissionOverwrites.create(userToAdd, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ User Added Successfully')
      .setDescription(`${userToAdd} has been added to the ticket.`)
      .addFields(
        { name: '👤 Added User', value: `${userToAdd}`, inline: true },
        { name: '📋 Ticket', value: `#${ticketChannel.name}`, inline: true },
        { name: '⏰ Added At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor(0x00FF00)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    // Send notification to the added user
    const notificationEmbed = new EmbedBuilder()
      .setTitle('📩 Added to Ticket')
      .setDescription(`You have been added to a support ticket.`)
      .addFields(
        { name: '🎫 Ticket Channel', value: `${ticketChannel}`, inline: true },
        { name: '👤 Added By', value: `${interaction.user}`, inline: true },
        { name: '⏰ Added At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor(0x0099FF)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    try {
      await userToAdd.send({ embeds: [notificationEmbed] });
    } catch (error) {
      // Silently fail if user has DMs disabled
      if (error.code !== 50007) {
        console.error('Failed to send DM to added user:', error);
      }
    }

    // Send a notification message in the ticket channel
    const channelNotificationEmbed = new EmbedBuilder()
      .setTitle('👥 User Added to Ticket')
      .setDescription(`${userToAdd} has been added to this ticket by ${interaction.user}.`)
      .setColor(0x0099FF)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    await ticketChannel.send({ embeds: [channelNotificationEmbed] });

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    console.error('Error adding user to ticket:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error Adding User')
      .setDescription('An error occurred while trying to add the user to the ticket.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleTicketClose(interaction, activeTickets, ticketsFile) {
  // Defer the reply immediately to prevent timeout
  await interaction.deferReply({ ephemeral: true });

  const ticketChannel = interaction.channel;
  const ticketData = activeTickets[ticketChannel.id];
  const closeReason = interaction.options.getString('reason') || 'No reason provided';

  // Check if this command is being used in a ticket channel
  if (!ticketData) {
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Not a Ticket Channel')
      .setDescription('This command can only be used in a ticket channel.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }

  // Check if user has staff permission to close
  const userRoles = interaction.member.roles.cache;
  const hasPermission = userRoles.some(role => ticketData.closeRoles.includes(role.id));

  if (!hasPermission) {
    const noPermEmbed = new EmbedBuilder()
      .setTitle('❌ Access Denied')
      .setDescription('You don\'t have permission to close this ticket.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [noPermEmbed] });
  }

  try {
    // Archive the ticket to history with reason
    const historyFile = path.join(__dirname, '../../bot/ticketHistory.json');
    const ticketHistory = existsSync(historyFile) ? JSON.parse(readFileSync(historyFile, 'utf8')) : {};

    const historyEntry = {
      ticketId: ticketChannel.id,
      userId: ticketData.userId,
      username: ticketData.username,
      category: ticketData.category,
      responses: ticketData.responses,
      createdAt: ticketData.createdAt,
      closedAt: Date.now(),
      reason: closeReason,
      formattedDate: new Date(ticketData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      closedDate: new Date(Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      status: closeReason
    };

    if (!ticketHistory[ticketData.userId]) {
      ticketHistory[ticketData.userId] = [];
    }

    ticketHistory[ticketData.userId].push(historyEntry);

    // Save updated history
    writeFileSync(historyFile, JSON.stringify(ticketHistory, null, 2));

    // Send DM to ticket creator before closing
    try {
      const ticketUser = await interaction.client.users.fetch(ticketData.userId);
      const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Your **${ticketData.category.replace(/_/g, ' ')}** ticket has been closed by staff.`)
        .addFields(
          { name: '📋 Category', value: ticketData.category.replace(/_/g, ' '), inline: true },
          { name: '👤 Closed By', value: `${interaction.user.tag}`, inline: true },
          { name: '❌ Reason', value: closeReason, inline: true },
          { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
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

    // Remove from active tickets
    delete activeTickets[ticketChannel.id];
    writeFileSync(ticketsFile, JSON.stringify(activeTickets, null, 2));

    const closeSuccessEmbed = new EmbedBuilder()
      .setTitle('🔒 Closing Ticket')
      .setDescription('This ticket is being closed by staff.')
      .addFields(
        { name: '👤 Closed By', value: `${interaction.user}`, inline: true },
        { name: '❌ Reason', value: closeReason, inline: true },
        { name: '⏰ Channel Deletion', value: 'In 5 seconds', inline: true },
        { name: '💌 Notice', value: 'Ticket archived to history', inline: true }
      )
      .setColor(0xFF6B00)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Ticket System • Session Closed' });

    await interaction.editReply({ embeds: [closeSuccessEmbed] });

    const publicCloseEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription('This ticket has been closed and archived.')
      .addFields(
        { name: '👤 Closed By', value: `${interaction.user}`, inline: true },
        { name: '❌ Reason', value: closeReason, inline: true },
        { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '💾 Archived', value: 'Ticket history saved ✓', inline: true }
      )
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System • Channel will be deleted shortly' });

    await ticketChannel.send({ embeds: [publicCloseEmbed] });
    setTimeout(() => ticketChannel.delete().catch(() => {}), 5000);

  } catch (error) {
    console.error('Error closing ticket:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error Closing Ticket')
      .setDescription('An error occurred while trying to close the ticket.')
      .setColor(0xFF0000)
      .setTimestamp()
      .setFooter({ text: 'Ticket System' });

    return interaction.editReply({ embeds: [errorEmbed] });
  }
}
