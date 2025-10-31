const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Display Minecraft SMP rules"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📋 Milk SMP Server Rules and Community Guidelines")
      .setDescription("Welcome to Milk SMP! To ensure a positive, fair, and enjoyable experience for all players, we have established these comprehensive rules. These guidelines promote respect, fairness, and creativity.\n\n⚠️ **CRITICAL WARNING**: **NOT READING OR IGNORING THESE RULES WILL RESULT IN PERMANENT BAN**. No grace period, no temporary bans, no second chances. By participating, you acknowledge full understanding and agreement. Our staff enforces strictly with zero tolerance.")
      .addFields(
        {
          name: "💬 General Discord Conduct (Part 1)",
          value: "**1. No Toxicity**: Absolutely no toxic behavior, insults, negativity, or harmful language. Keep interactions positive. *Reason*: Creates a welcoming environment free from hostility.\n\n**2. Respect and Kindness**: Treat all members with respect. Harassment, bullying, hate speech, racism, sexism, or any form of discrimination is strictly prohibited. *Reason*: We foster an inclusive community where everyone feels safe.\n\n**3. No Spamming or Flooding**: Avoid sending excessive messages, using all caps unnecessarily, or repeating content. *Reason*: Keeps channels readable and prevents disruption.",
          inline: false
        },
        {
          name: "💬 General Discord Conduct (Part 2)",
          value: "**4. Appropriate Content**: Keep discussions family-friendly. No NSFW, gore, violence, or inappropriate links/media. *Reason*: Maintains a suitable environment for all ages.\n\n**5. No Advertising**: Do not promote other servers, products, or services without permission. *Reason*: Protects our community from unwanted solicitations.\n\n**6. No Drama or Arguments**: Refrain from starting or escalating conflicts. Use private messages or staff for resolutions. *Reason*: Encourages peaceful interactions.",
          inline: false
        },
        {
          name: "🎮 In-Game Gameplay Rules (Part 1)",
          value: "**1. No Griefing**: Do not destroy, modify, or interfere with others' builds without explicit permission. *Reason*: Protects players' hard work and creativity.\n\n**2. Fair Play - No Cheating**: No hacks, dupes, x-ray mods, or unfair advantages. Play legitimately. *Reason*: Ensures competitive balance and fun for everyone.\n\n**3. Respect Property**: Do not steal items, enter locked areas, or take resources without consent. *Reason*: Builds trust and prevents conflicts.\n\n**4. No Exploiting Bugs**: Report glitches to staff instead of abusing them. *Reason*: Maintains server stability and fairness.",
          inline: false
        },
        {
          name: "🎮 In-Game Gameplay Rules (Part 2)",
          value: "**5. PvP with Consent**: Player-vs-player combat requires mutual agreement. *Reason*: Avoids unwanted fights and promotes sportsmanship.\n\n**6. Appropriate Builds**: Avoid offensive, inappropriate, or disruptive structures. *Reason*: Keeps the world enjoyable and respectful.\n\n**7. Follow Staff Instructions**: Listen to and comply with moderators and admins. *Reason*: Staff decisions maintain order and safety.",
          inline: false
        },
        {
          name: "⚖️ Enforcement and Consequences",
          value: "Our moderation team enforces rules with **ZERO TOLERANCE**. All violations are taken seriously and may result in immediate action.\n\n- **Any Offense**: Depending on severity, can lead to warnings, mutes, or **PERMANENT BAN**. No temporary bans or grace periods.\n\n**No Appeals for Permanent Bans**: Decisions are final. Ignorance or not reading rules = automatic permanent ban.\n\n**Staff Discretion**: Admins have absolute authority. We monitor all activity closely.\n\n**Remember**: These rules protect our community. Violate at your own risk.",
          inline: false
        }
      )
      .setColor(0x3498db)
      .setFooter({ text: "Milk SMP - Building a better Minecraft community together." })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};