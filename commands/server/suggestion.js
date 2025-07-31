const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const suggestionCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suggestion")
        .setDescription("Suggest a feature or improvement")
        .addStringOption(option =>
            option.setName("suggestion")
                .setDescription("Your suggestion text")
                .setRequired(true)
                .setMaxLength(200)
        )
        .addAttachmentOption(option =>
            option.setName("attachment")
                .setDescription("Optional attachment for your suggestion")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const suggestion = interaction.options.getString("suggestion");
        const attachment = interaction.options.getAttachment("attachment");
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 60 * 60 * 1000; 

        // Check if user is on cooldown
        if (suggestionCooldowns.has(userId)) {
            const expiration = suggestionCooldowns.get(userId);
            const remaining = expiration - now;

            if (remaining > 0) {
                const minutes = Math.ceil(remaining / (60 * 1000));
                return interaction.editReply({
                    content: `You can only send one suggestion per hour. Please wait ${minutes} more minute(s).`,
                });
            }
        }

        suggestionCooldowns.set(userId, now + cooldownTime);

        const CHANNELID = '1397448104885747826';
        const channel = interaction.guild.channels.cache.get(CHANNELID);

        if (!channel) {
            return interaction.editReply({
                content: "Suggestion channel not found.",
            });
        }

        const embed = new EmbedBuilder()
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setColor(0x00ff00)
            .setTitle("New Suggestion")
            .setDescription(`\`\`\`${suggestion}\`\`\``)
            .setFooter({ text: `Suggested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        if (attachment) {
            embed.setImage(attachment.url);
        }

        try {
            const message = await channel.send({ embeds: [embed] });
            await message.startThread({
                name: `Suggestion by ${interaction.user.tag}`,
                autoArchiveDuration: 60,
                reason: "New suggestion thread",
            });
            await message.react("⬆️");
            await message.react("⬇️");

            return interaction.editReply({
                content: "Your suggestion has been sent successfully!",
            });
        } catch (error) {
            console.error("Error sending suggestion:", error);
            return interaction.editReply({
                content: "There was an error sending your suggestion. Please try again later.",
            });
        }
    }
};
