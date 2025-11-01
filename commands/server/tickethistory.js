const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickethistory')
    .setDescription('View ticket history and statistics')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('View ticket history for a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to check ticket history for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View overall ticket statistics')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const ticketHistoryFile = path.join(__dirname, '../bot/ticketHistory.json');
    const ticketHistory = fs.existsSync(ticketHistoryFile) 
      ? JSON.parse(fs.readFileSync(ticketHistoryFile, 'utf8')) 
      : {};

    if (subcommand === 'user') {
      const targetUser = interaction.options.getUser('user');
      const userHistory = ticketHistory[targetUser.id] || [];

      if (userHistory.length === 0) {
        const noHistoryEmbed = new EmbedBuilder()
          .setTitle('📋 No Ticket History')
          .setDescription(`${targetUser.tag} has no closed tickets.`)
          .setColor(0xFF9900)
          .setTimestamp()
          .setFooter({ text: 'Ticket System • History' });

        return interaction.reply({ embeds: [noHistoryEmbed], ephemeral: true });
      }

      const historyEmbed = new EmbedBuilder()
        .setTitle(`📋 Ticket History - ${targetUser.tag}`)
        .setDescription(`Total closed tickets: **${userHistory.length}**`)
        .setColor(0x0099FF)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Ticket System • User History' });

      // Group by status
      const statuses = {};
      userHistory.forEach(ticket => {
        if (!statuses[ticket.status]) {
          statuses[ticket.status] = [];
        }
        statuses[ticket.status].push(ticket);
      });

      // Add fields for each status
      Object.entries(statuses).forEach(([status, tickets]) => {
        const statusEmoji = status === 'inactivity' ? '⏰' : status === 'staff_closed' ? '✅' : '❌';
        const ticketList = tickets.map((t, i) => 
          `**${i + 1}.** [${t.category.toUpperCase()}] - Closed: ${t.closedDate}`
        ).join('\n');

        historyEmbed.addFields({
          name: `${statusEmoji} ${status.replace(/_/g, ' ').toUpperCase()} (${tickets.length})`,
          value: ticketList.substring(0, 1024) || 'None',
          inline: false
        });
      });

      return interaction.reply({ embeds: [historyEmbed], ephemeral: true });
    }

    if (subcommand === 'stats') {
      let totalTickets = 0;
      let totalUsers = 0;
      const categoryCounts = {};
      const reasonCounts = {};

      Object.entries(ticketHistory).forEach(([userId, tickets]) => {
        totalUsers++;
        tickets.forEach(ticket => {
          totalTickets++;
          
          const category = ticket.category;
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          const reason = ticket.reason || ticket.status;
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      });

      const statsEmbed = new EmbedBuilder()
        .setTitle('📊 Ticket System Statistics')
        .setDescription('Overall system statistics and breakdown')
        .addFields(
          { name: '🎫 Total Tickets', value: `\`${totalTickets}\``, inline: true },
          { name: '👥 Total Users', value: `\`${totalUsers}\``, inline: true },
          { name: '📈 Average per User', value: `\`${(totalTickets / totalUsers || 0).toFixed(2)}\``, inline: true }
        )
        .setColor(0x00FF00)
        .setTimestamp()
        .setFooter({ text: 'Ticket System • Statistics' });

      // Category breakdown
      const categories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `• **${cat.toUpperCase()}**: ${count}`)
        .join('\n');

      if (categories) {
        statsEmbed.addFields({
          name: '📋 By Category',
          value: categories,
          inline: false
        });
      }

      // Closure reason breakdown
      const reasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `• **${reason.replace(/_/g, ' ')}**: ${count}`)
        .join('\n');

      if (reasons) {
        statsEmbed.addFields({
          name: '🔍 Closure Reasons',
          value: reasons,
          inline: false
        });
      }

      return interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    }
  }
};
