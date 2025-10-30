const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');

// === SERVIDOR WEB (PARA O RENDER NÃO DESLIGAR) ===
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Bot online 24/7!'));
app.listen(PORT, () => console.log(`Web rodando na porta ${PORT}`));

// === BOT DO DISCORD ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const prefix = "!";
const cargoPermitido = "Nobreza";

client.once(Events.ClientReady, () => {
    console.log(`✅ Bot ONLINE: ${client.user.tag}`);
    console.log(`Use: !clearuser @usuário DD-MM-YYYY HH:MM`);
});

client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    if (comando === 'clearuser') {
        // Verifica permissão
        const isAdmin = message.member.permissions.has('Administrator');
        const temCargo = message.member.roles.cache.some(r => r.name === cargoPermitido);
        if (!isAdmin && !temCargo) return message.reply('❌ Apenas **Admins** ou **Nobreza** podem usar!');

        const user = message.mentions.members.first();
        if (!user) return message.reply('❌ Marca um usuário! Ex: `!clearuser @bea 30-10-2025 12:00`');

        const [dia, mes, ano] = args[1].split('-');
        const [hora, min] = args[2].split(':');
        const dataInicio = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
        if (isNaN(dataInicio)) return message.reply('❌ Data inválida! Use: DD-MM-YYYY HH:MM');

        let total = 0;
        const msgStatus = await message.channel.send(`🔍 Apagando mensagens de **${user.displayName}** desde **${dataInicio.toLocaleString('pt-PT')}**...`);

        const timeout = setTimeout(() => {
            msgStatus.edit(`⚠️ Parou por timeout. Apaguei **${total}** mensagens.`);
        }, 60000);

        for (const canal of message.guild.channels.cache.values()) {
            if (canal.type !== 0) continue;
            let ultimaId;
            while (true) {
                const opcoes = { limit: 30 };
                if (ultimaId) opcoes.before = ultimaId;
                const msgs = await canal.messages.fetch(opcoes).catch(() => null);
                if (!msgs || msgs.size === 0) break;

                const paraApagar = msgs.filter(m =>
                    m.author.id === user.id &&
                    m.createdTimestamp >= dataInicio.getTime()
                );
                if (paraApagar.size > 0) {
                    const apagadas = await canal.bulkDelete(paraApagar, true).catch(() => null);
                    if (apagadas) total += apagadas.size;
                }
                if (msgs.size < 30) break;
                ultimaId = msgs.last().id;
            }
        }

        clearTimeout(timeout);
        msgStatus.edit(`✅ Apaguei **${total} mensagens** de ${user} desde **${dataInicio.toLocaleString('pt-PT')}**`);
        console.log(`[SUCESSO] Apaguei ${total} mensagens de ${user.user.tag}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
