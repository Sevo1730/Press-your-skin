import "dotenv/config";
import { randomBytes } from "node:crypto";
import { Client, Events, GatewayIntentBits, PermissionFlagsBits, Partials } from "discord.js";
import { SLOTS } from "../lib/gameLogic";

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID!;
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BOT_SECRET = process.env.BOT_SECRET!;

for (const [name, value] of Object.entries({ DISCORD_TOKEN: process.env.DISCORD_TOKEN, DISCORD_CHANNEL_ID: CHANNEL_ID, BOT_SECRET })) {
  if (!value) throw new Error(`Missing env var ${name} — see .env.example`);
}

// ponytail: the pool and round counter live in this process. v1 state is ephemeral
// and a round lasts minutes; restarting the bot just means re-running !join.
const pool = new Map<string, string>(); // userId -> display name
let round = 1;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel], // needed to DM users we haven't talked to
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || msg.channelId !== CHANNEL_ID || !msg.inGuild()) return;
  const [cmd] = msg.content.trim().toLowerCase().split(/\s+/);

  if (cmd === "!join") {
    pool.set(msg.author.id, msg.member?.displayName ?? msg.author.username);
    await msg.react("✅").catch(() => {});
    return;
  }

  if (cmd === "!pool") {
    const names = [...pool.values()];
    await msg.reply(names.length ? `Pool (${names.length}): ${names.join(", ")}` : "Pool is empty. Type `!join`.");
    return;
  }

  // admin-only: !pick @a @b @c  → DMs each a private controller link
  if (cmd === "!pick") {
    if (!msg.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await msg.reply("Only the streamer/mods can pick players.");
      return;
    }
    const picked = [...msg.mentions.users.values()].slice(0, SLOTS.length);
    if (picked.length !== SLOTS.length) {
      await msg.reply("Mention exactly 3 players: `!pick @a @b @c`");
      return;
    }

    round += 1;
    const lines: string[] = [];

    for (const [i, user] of picked.entries()) {
      const slot = SLOTS[i];
      const token = randomBytes(16).toString("hex");
      const name = pool.get(user.id) ?? user.username;

      const res = await fetch(`${APP_URL}/api/tokens`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-bot-secret": BOT_SECRET },
        body: JSON.stringify({ token, slot, round, user: name }),
      });
      if (!res.ok) {
        await msg.reply(`Could not register ${slot} (${res.status}) — is the Next.js app running at ${APP_URL}?`);
        return;
      }

      const link = `${APP_URL}/play/${token}`;
      const dmed = await user
        .send(`You're **${slot}** in round ${round} of Press Your Luck!\nYour controller: ${link}\n(Don't share it — it's your button.)`)
        .then(() => true)
        .catch(() => false);

      lines.push(`${slot}: ${user} ${dmed ? "✅ DM sent" : "⚠️ DMs closed — streamer must send the link privately"}`);
    }

    pool.clear();
    await msg.reply(`**Round ${round}**\n${lines.join("\n")}\nSet their names in /admin and give someone the turn.`);
  }
});

client.once(Events.ClientReady, (c) => console.log(`Bot ready as ${c.user.tag} — watching channel ${CHANNEL_ID}`));
client.login(process.env.DISCORD_TOKEN);
