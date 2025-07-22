const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Lookup a player by their username')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username of the player to lookup')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('edition')
                .setDescription('The edition of the player (Java/Bedrock)')
                .addChoices(
                    { name: 'Java', value: 'java' },
                    { name: 'Bedrock', value: 'bedrock' }
                )
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const USERNAME = interaction.options.getString('username');
        const EDITION = interaction.options.getString('edition');

        const BEDROCK = `https://mcprofile.io/api/v1/bedrock/gamertag/${USERNAME}`;
        const JAVA = `https://mcprofile.io/api/v1/java/username/${USERNAME}`;

        try {
            const response = await fetch(EDITION === 'bedrock' ? BEDROCK : JAVA);
            const data = await response.json();

            const isJavaValid = EDITION === 'java' && data.username && data.uuid;
            const isBedrockValid = EDITION === 'bedrock' && data.gamertag && data.xuid;
            
            if (!data || (!isJavaValid && !isBedrockValid)) {
                return interaction.editReply({ embeds: [
                    new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ Player Not Found')
                        .setDescription(`No player found with the username \`${USERNAME}\` for edition \`${EDITION}\`.`)
                ]});
            }

            if (data) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

                if (EDITION === 'java') {
                    embed
                        .setTitle(`✅ Player Found: ${data.username}`)
                        .addFields(
                            { name: 'Username', value: data.username, inline: true },
                            { name: 'UUID', value: data.uuid, inline: true },
                            { name: 'Edition', value: 'Java', inline: true },
                            { name: 'Download Skin', value: `[Click Here](https://mc-heads.net/download/${data.username})`, inline: true }
                        )
                        .setThumbnail(`https://mc-heads.net/avatar/${USERNAME}`)
                        .setImage(`https://mc-heads.net/player/${USERNAME}`);
                    
                    if (data.cape) {
                        embed.addFields({ name: 'Cape', value: 'Yes', inline: true });
                    }
                } else if (EDITION === 'bedrock') {
                    embed
                        .setTitle(`✅ Player Found: ${data.gamertag}`)
                        .addFields(
                            { name: 'Gamertag', value: data.gamertag, inline: true },
                            { name: 'XUID', value: data.xuid, inline: true },
                            { name: 'Edition', value: 'Bedrock', inline: true },
                            { name: 'Account Tier', value: data.accounttier, inline: true },
                            { name: 'Gamescore', value: data.gamescore, inline: true },
                        )
                        .setImage(data.skin);
                    
                    if (data.linked && data.java_name) {
                        embed.addFields({ name: 'Linked Java Account', value: data.java_name, inline: true });
                    }
                }

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error fetching player data:', error);
            return interaction.editReply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Error')
                    .setDescription('An error occurred while fetching player data. Please try again later.')
            ]});
        }
    }
}