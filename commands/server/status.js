const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check Minecraft server status"),

  async execute(interaction) {
    await interaction.deferReply();

    const serverIP = "160.187.210.218:26058";
    const apiURL = `https://api.mcsrvstat.us/3/${serverIP}`;

    try {
      const response = await fetch(apiURL);
      const data = await response.json();

      if (!data || !data.online) {
        const offlineEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("❌ Server Offline")
          .setDescription(
            `The server \`${serverIP}\` is currently offline or unreachable.`
          );
        return interaction.editReply({ embeds: [offlineEmbed] });
      }

      let playerListText = "None";
      if (data.players && data.players.list && data.players.list.length > 0) {
        const playerNames = data.players.list.map((player) => player.name);

        if (playerNames.length <= 10) {
          playerListText = playerNames.join(", ");
        } else {
          const firstTen = playerNames.slice(0, 10);
          const remaining = playerNames.length - 10;
          playerListText = `${firstTen.join(", ")} and ${remaining} more`;
        }
      }

      const embed = new EmbedBuilder()
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setColor(0x00ff00)
        .setTitle("✅ Server Online")
        .addFields(
          { name: "IP", value: `\`${data.ip || serverIP}\``, inline: true },
          { name: "Port", value: `\`${data.port}\``, inline: true },
          {
            name: "Players",
            value: `${data.players.online}/${data.players.max}`,
            inline: true,
          },
          {
            name: "Version",
            value: `${data.version || "Unknown"}`,
            inline: true,
          },
          {
            name: "MOTD",
            value: data.motd?.clean?.join("\n") || "None",
            inline: false,
          },
          {
            name: "Online Players",
            value: playerListText,
            inline: false,
          }
        )
        .setFooter({ text: "Milk SMP" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "❌ An error occurred while fetching the server status."
      );
    }
  },
};
