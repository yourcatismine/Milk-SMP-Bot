const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Say something you want")
    .addStringOption((option) =>
      option.setName("message").setDescription("The message you want to stay")
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const MESSAGE = interaction.options.getString("message") || "Mama mo";

    await interaction.editReply({ content: `${MESSAGE}` });
  },
};
