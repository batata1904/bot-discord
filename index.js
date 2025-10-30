const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');

// === SERVIDOR WEB (PARA RENDER NÃO DESLIGAR) ===
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Bot 24/7 ativo!'));
app.listen(PORT, () => console.log(`Web na porta ${PORT}`));

// === BOT DISCORD ===
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
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    console.log(`Comando: !clearuser @usuário DD-MM-YYYY HH:MM`);
});

client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    if (comando === 'clearuser') {
        // PERMISSÃO
        const isAdmin = message.member.permissions.has('Administrator');
        const temCargo = message.member.roles.cache.some(r => r.name === cargoPermitido);
        if (!isAdmin && !temCargo) return message.reply('❌ Apenas **Admins** ou **Nobreza**!');

        const user = message.mentions.members.first();
        if (!user) return message.reply('❌ Marca um usuário!');

        const [dia, mes, ano] = args[1].split('-');
        const [hora, min] = args[2].split(':');
        const dataInicio = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
        if (isNaN(dataInicio.getTime())) return message.reply('❌ Data inválida! Use: `30-10-2025 12:00`');

        let total = 0;
        const statusMsg = await message.channel.send(`🔍 Procurando mensagens de **${user.displayName}** desde **${dataInicio.toLocaleString('pt-PT')}**...`);

        try {
            for (const [id, canal] of message.guild.channels.cache) {
                if (canal.type !== 0) continue; // só texto
                if (!canal.permissionsFor(client.user).has(['ViewChannel', 'ReadMessageHistory', 'ManageMessages'])) continue;

                let ultimaId;
                while (true) {
                    const opcoes = { limit: 100 };
                    if (ultimaId) opcoes.before = ultimaId;

                    const mensagens = await canal.messages.fetch(opcoes).catch(() => null);
                    if (!mensagens || mensagens.size === 0) break;

                    const paraApagar = mensagens.filter(m =>
                        m.author.id === user.id &&
                        m.createdTimestamp >= dataInicio.getTime()
                    );

                    if (paraApagar.size > 0) {
                        const apagadas = await canal.bulkDelete(paraApagar, true).catch(() => null);
                        if (apagadas) total += apagadas.size;
                        await statusMsg.edit(`🗑️ Apagando... (${total} até agora)`);
                    }

                    if (mensagens.size < 100) break;
                    ultimaId = mensagens.last().id;

                    // Evita rate limit
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            statusMsg.edit(`✅ **Concluído!** Apaguei **${total} mensagens** de ${user} desde **${dataInicio.toLocaleString('pt-PT')}**`);
            console.log(`[SUCESSO] Apaguei ${total} mensagens de ${user.user.tag}`);
        } catch (err) {
            statusMsg.edit(`❌ Erro: ${err.message}`);
            console.error(err);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
