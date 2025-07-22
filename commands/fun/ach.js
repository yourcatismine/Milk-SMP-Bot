const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("achievement")
        .setDescription("Generates a Minecraft achievement with custom text")
        .addStringOption(option =>
            option.setName("text")
                .setDescription("The achievement text to display")
                .setRequired(true)
                .setMaxLength(100)
        ),
    
    async execute(interaction) {
        const text = interaction.options.getString("text");
        
        // Replace spaces with + for the URL
        const encodedText = encodeURIComponent(text.replace(/ /g, "+"));
        
        const embed = new EmbedBuilder()
            .setTitle("Minecraft Achievement!")
            .setImage(`https://minecraftskinstealer.com/achievement/12/Achievement%20Get!/${encodedText}`)
            .setColor("#00FF00"); // Green color for achievements
            
        return await interaction.reply({ embeds: [embed] });
    }
};