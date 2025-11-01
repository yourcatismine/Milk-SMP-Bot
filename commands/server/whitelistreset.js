const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const whitelistHandler = require('../../bot/Whitelist.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelistreset')
    .setDescription('Reset a user\'s whitelist request and cooldown (Admin only)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The Discord user to reset')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for reset (optional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if user has admin permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need **Administrator** permissions to use this command.')
        .setTimestamp();

      return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
    }

    try {
      // Reset the user's whitelist using the exported function
      const resetResult = whitelistHandler.resetUserWhitelist(targetUser.id);

      if (!resetResult.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Reset Failed')
          .setDescription(resetResult.message)
          .setTimestamp();

        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // Remove the approved role if configured and user has it
      let roleRemoved = false;
      const APPROVED_ROLE_ID = '1433817171297042525'; // Same role ID as in Whitelist.js
      if (APPROVED_ROLE_ID) {
        try {
          const member = await interaction.guild.members.fetch(targetUser.id);
          if (member.roles.cache.has(APPROVED_ROLE_ID)) {
            await member.roles.remove(APPROVED_ROLE_ID);
            roleRemoved = true;
            console.log(`✅ Removed approved role from ${targetUser.tag}`);
          }
        } catch (roleError) {
          console.error(`❌ Could not remove role from ${targetUser.tag}:`, roleError.message);
        }
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Whitelist Reset Complete')
        .setDescription(`Successfully reset whitelist data for ${targetUser}`)
        .addFields(
          { name: '👤 User', value: `${targetUser.tag}`, inline: true },
          { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
          { name: '📋 Action', value: 'Cooldown Cleared + Request Removed + Role Removed', inline: false },
          {
            name: '🎮 Removed Gamertags',
            value: resetResult.cleared.length > 0 ? resetResult.cleared.join('\n') : 'None found',
            inline: false
          },
          { name: '👥 Role Removed', value: roleRemoved ? '✅ Yes' : '❌ No (user didn\'t have the role)', inline: false },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '👨‍💼 Reset By', value: interaction.user.tag, inline: true },
          { name: '⏰ Reset Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Whitelist System • Admin Action' })
        .setTimestamp();

      // Send public confirmation
      await interaction.reply({ embeds: [successEmbed] });

      // Also send a DM to the user if possible
      try {
        const userDMEmbed = new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle('🔄 Whitelist Request Reset')
          .setDescription('Your whitelist request has been reset by an administrator.')
          .addFields(
            { name: '📝 Reason', value: reason, inline: false },
            { name: '💡 What This Means', value: '• Your cooldown has been cleared\n• You can submit a new request immediately\n• Any previous pending requests were removed', inline: false },
            { name: '📞 Need Help?', value: 'Please contact staff in the support channel', inline: false }
          )
          .setFooter({ text: 'Whitelist System' })
          .setTimestamp();

        await targetUser.send({ embeds: [userDMEmbed] });
      } catch (error) {
        // User might have DMs disabled - that's okay, just log it
        console.log(`⚠️ Could not send DM to ${targetUser.tag} - they may have DMs disabled`);
      }

      console.log(`📊 Whitelist reset for ${targetUser.tag} - Reason: ${reason}`);

    } catch (error) {
      console.error('Error resetting whitelist:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error During Reset')
        .setDescription('An error occurred while resetting the whitelist request.')
        .addFields(
          { name: '⚠️ Error', value: error.message, inline: false }
        )
        .setFooter({ text: 'Whitelist System' })
        .setTimestamp();

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
