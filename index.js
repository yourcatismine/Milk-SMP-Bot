// Prevent crashes from unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection:", reason);
});

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");

const { CLIENT, GUILDID, TOKEN } = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Discord Commands And Login
client.commands = new Collection();

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT, GUILDID),
      {
        body: commands,
      }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();

const eventsPath = path.join(__dirname, "bot");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

//Server Status
const STATUS_CHANNEL_ID = "1383673159865340024";
const SERVER_IP = "160.187.210.218:26058";
const API_URL = `https://api.mcsrvstat.us/bedrock/3/${SERVER_IP}`;
const STATUS_FILE = path.join(__dirname, 'status_message.json');
let statusMessageId = null;

// Load saved message ID on startup
function loadStatusMessageId() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      statusMessageId = data.messageId;
      console.log(`Loaded status message ID: ${statusMessageId}`);
    }
  } catch (error) {
    console.error('Error loading status message ID:', error);
  }
}

// Save message ID to file
function saveStatusMessageId(messageId) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ messageId }));
    statusMessageId = messageId;
  } catch (error) {
    console.error('Error saving status message ID:', error);
  }
}

async function fetchServerStatus() {
  try {
    const res = await fetch(API_URL);
    return await res.json();
  } catch (err) {
    console.error("Status fetch error", err);
    return null;
  }
}

async function updateStatus() {
  const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const data = await fetchServerStatus();
  const online = data?.online ?? false;
  const namePrefix = online ? "🟢・status" : "🔴・status";

  try {
    if (channel.name !== namePrefix) await channel.setName(namePrefix);
  } catch (e) {
    console.error("Failed to rename channel:", e);
  }

  // Prepare player list for online servers
  let playerListField = null;
  if (
    online &&
    data.players &&
    data.players.list &&
    data.players.list.length > 0
  ) {
    const playerNames = data.players.list.map((player) => player.name);

    let playerListText;
    if (playerNames.length <= 10) {
      playerListText = playerNames.join(", ");
    } else {
      const firstTen = playerNames.slice(0, 10);
      const remaining = playerNames.length - 10;
      playerListText = `${firstTen.join(", ")} and ${remaining} more`;
    }

    playerListField = {
      name: "👤 Online Players",
      value: playerListText,
      inline: false,
    };
  }

  // Build fields array based on server status
  let fields = [];

  if (online) {
    fields = [
      {
        name: "📦 Version",
        value: data.version || "Unknown",
        inline: true,
      },
      {
        name: "👥 Players",
        value: `${data.players.online}/${data.players.max}`,
        inline: true,
      },
      {
        name: "🧭 IP:Port",
        value: `\`${SERVER_IP}\``,
        inline: false,
      },
    ];

    // Add MOTD if available
    if (data.motd?.clean) {
      fields.push({
        name: "📝 MOTD",
        value: data.motd.clean.join("\n") || "None",
        inline: false,
      });
    }

    // Add player list if there are players online
    if (playerListField) {
      fields.push(playerListField);
    }
  } else {
    fields = [
      {
        name: "🧭 IP:Port",
        value: `\`${SERVER_IP}\``,
        inline: false,
      },
    ];
  }

  const embed = {
    title: online ? "🟢 Server is Online!" : "🔴 Server is Offline!",
    color: online ? 0x57f287 : 0xed4245,
    thumbnail: {
      url: "https://api.mcsrvstat.us/icon/" + SERVER_IP.split(":")[0],
    },
    fields: fields,
    footer: {
      text: "Milk SMP — Auto status updated",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    if (statusMessageId) {
      try {
        const msg = await channel.messages.fetch(statusMessageId);
        await msg.edit({ embeds: [embed] });
      } catch (fetchError) {
        // Message doesn't exist, delete old ID and send new message
        console.log("Previous status message not found, sending new one");
        const sent = await channel.send({ embeds: [embed] });
        saveStatusMessageId(sent.id);
      }
    } else {
      const sent = await channel.send({ embeds: [embed] });
      saveStatusMessageId(sent.id);
    }
  } catch (e) {
    console.error("Error sending/editing status embed:", e);
    try {
      const fallback = await channel.send({ embeds: [embed] });
      saveStatusMessageId(fallback.id);
    } catch (sendErr) {
      console.error("Fallback send failed:", sendErr);
    }
  }
}

// Initialize status system on bot ready
async function initializeStatus() {
  loadStatusMessageId();
  
  // If we have a saved message ID, try to delete the old message first
  if (statusMessageId) {
    try {
      const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
      if (channel?.isTextBased()) {
        const oldMessage = await channel.messages.fetch(statusMessageId);
        await oldMessage.delete();
        console.log("Deleted previous status message");
      }
    } catch (error) {
      console.log("Could not delete previous status message (may not exist)");
    }
    // Reset message ID so we create a new one
    statusMessageId = null;
  }
  
  // Send initial status
  await updateStatus();
  
  // Set up interval for updates
  setInterval(updateStatus, 60 * 1000);
}

client.once("ready", () => {
  initializeStatus();
});

client.login(TOKEN);
