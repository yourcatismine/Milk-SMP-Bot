const { ActivityType, Events } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`EnderSMP`);

    const statuses = [
      { name: "Milk SMP", type: ActivityType.Playing },
      { name: "Paid Bedrock Server!", type: ActivityType.Listening },
      { name: "Filipino!", type: ActivityType.Competing },
      { name: "Season 1 Released!", type: ActivityType.Playing },
    ];

    function updateStatus() {
      const random = statuses[Math.floor(Math.random() * statuses.length)];

      client.user.setPresence({
        activities: [{ name: random.name, type: random.type }],
        status: "dnd",
      });

      const nextUpdate = Math.floor(Math.random() * 10000) + 10000;

      setTimeout(updateStatus, nextUpdate);
    }

    updateStatus();
  },
};
