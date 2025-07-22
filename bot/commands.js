const {
  Events,
  MessageFlags,
  EmbedBuilder,
  Collection,
} = require("discord.js");

const cooldowns = new Collection();
const cooldownTime = 5000;

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const now = Date.now();

    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Collection());
    }

    const userCooldowns = cooldowns.get(commandName);

    if (userCooldowns.has(userId)) {
      const lastUsed = userCooldowns.get(userId);
      const timeSinceLastUse = now - lastUsed;

      if (timeSinceLastUse < cooldownTime) {
        const timeLeft = ((cooldownTime - timeSinceLastUse) / 1000).toFixed(0);
        const cooldowntime = new EmbedBuilder()
          .setDescription(
            `You have to wait **${timeLeft} seconds** before sending \`/${commandName}\`!`
          )
          .setColor("Red")
          .setFooter({
            text: interaction.client.user.username,
            iconURL: interaction.client.user.avatarURL({ dynamic: true }),
          });

        return interaction.reply({
          embeds: [cooldowntime],
          components: [],
          ephemeral: true,
        });
      }
    }
    userCooldowns.set(userId, now); // Set cooldown for regular role
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `No command matching ${interaction.commandName} was found`
            )
            .setColor("Red"),
        ],
      });
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
