const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { r } = require('tar');

const ALLOWEDID = '1342370557009854484';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iplookup')
        .setDescription('Lookup information about an IP address')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address to lookup')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        if(ALLOWEDID !== interaction.user.id) {
            return interaction.editReply({content: 'You are not allowed to use this command.'});
        }
        
        const IP = interaction.options.getString('ip');
        const API_KEY = 'a4b4abd805edfe3e4e0e6a91f922efa4';
        const API_URL = `https://iplocate.io/api/lookup/${IP}?apikey=${API_KEY}`;

        // Basic IP validation regex
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        if (!ipRegex.test(IP)) {
            return interaction.editReply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Invalid IP Address')
                    .setDescription(`The IP address \`${IP}\` is not in a valid format. Please provide a valid IPv4 address.`)
            ]});
        }

        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            if (!response.ok || !data.ip) {
                return interaction.editReply({ embeds: [
                    new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ IP Not Found')
                        .setDescription(`Unable to lookup information for IP address \`${IP}\`.`)
                ]});
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(`🌍 IP Lookup: ${data.ip}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            // Basic location information
            embed.addFields(
                { name: '📍 Country', value: `${data.country} (${data.country_code})`, inline: true },
                { name: '🏙️ City', value: data.city || 'Unknown', inline: true },
                { name: '🌏 Continent', value: data.continent || 'Unknown', inline: true }
            );

            if (data.subdivision) {
                embed.addFields({ name: '🗺️ State/Region', value: data.subdivision, inline: true });
            }

            if (data.postal_code) {
                embed.addFields({ name: '📮 Postal Code', value: data.postal_code, inline: true });
            }

            if (data.time_zone) {
                embed.addFields({ name: '🕐 Time Zone', value: data.time_zone, inline: true });
            }

            // Coordinates
            if (data.latitude && data.longitude) {
                embed.addFields({ name: '🧭 Coordinates', value: `${data.latitude}, ${data.longitude}`, inline: true });
            }

            // ISP/Company information
            if (data.company && data.company.name) {
                embed.addFields({ name: '🏢 ISP/Company', value: data.company.name, inline: true });
            }

            if (data.asn && data.asn.name) {
                embed.addFields({ name: '🔗 ASN', value: `${data.asn.asn} - ${data.asn.name}`, inline: true });
            }

            // Privacy/Security flags
            const privacyFlags = [];
            if (data.privacy) {
                if (data.privacy.is_vpn) privacyFlags.push('VPN');
                if (data.privacy.is_proxy) privacyFlags.push('Proxy');
                if (data.privacy.is_tor) privacyFlags.push('Tor');
                if (data.privacy.is_datacenter) privacyFlags.push('Datacenter');
                if (data.privacy.is_anonymous) privacyFlags.push('Anonymous');
                if (data.privacy.is_abuser) privacyFlags.push('Abuser');
            }

            if (privacyFlags.length > 0) {
                embed.addFields({ name: '🚨 Security Flags', value: privacyFlags.join(', '), inline: true });
            } else if (data.privacy) {
                embed.addFields({ name: '✅ Security Status', value: 'Clean', inline: true });
            }

            // Network information
            if (data.network) {
                embed.addFields({ name: '🌐 Network', value: data.network, inline: true });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching IP data:', error);
            return interaction.editReply({ embeds: [
                new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Error')
                    .setDescription('An error occurred while fetching IP data. Please try again later.')
            ]});
        }
    }
};