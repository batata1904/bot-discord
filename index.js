const { Client, GatewayIntentBits, Events, PermissionsBitField } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Bot 24/7 ATIVO!'));
app.listen(PORT, () => console.log(`Web rodando na porta ${PORT}`));

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
    console.log(`Use: !clearuser @usuário DD-MM-YYYY HH:MM`);
});

client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    if (comando === 'clearuser') {
        console.log(`[COMANDO] ${message.author.tag} usou !clearuser`);

        // PERMISSÃO DO USUÁRIO
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const temCargo = message.member.roles.cache.some(r => r.name === cargoPermitido);
        if (!isAdmin && !temCargo) {
            console.log(`[ERRO] ${message.author.tag} sem permissão`);
            return message.reply('❌ Apenas **Admins** ou **Nobreza**!');
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply('❌ Marca um usuário!');

        const [dia, mes, ano] = args[1].split('-');
        const [hora, min] = args[2].split(':');
        const dataInicio = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
        if (isNaN(dataInicio.getTime())) return message.reply('❌ Data inválida! Use: `30-10-2025 12:00`');

        let total = 0;
        const statusMsg = await message.channel.send(`🔍 Procurando mensagens de **${user.displayName}**...`);

        try {
            for (const [id, canal] of message.guild.channels.cache) {
                if (canal.type !== 0) continue;

                // VERIFICA PERMISSÃO DO BOT NO CANAL
                const perms = canal.permissionsFor(client.user);
                if (!perms || !perms.has(['ViewChannel', 'ReadMessageHistory', 'ManageMessages'])) {
                    console.log(`[SEM PERMISSÃO] #${canal.name}`);
                    continue;
                }

                let ultimaId;
                while (true) {
                    const opcoes = { limit: 100 };
                    if (ultimaId) opcoes.before = ultimaId;

                    const msgs = await canal.messages.fetch(opcoes).catch(err => {
                        console.log(`[ERRO FETCH] #${canal.name}: ${err.message}`);
                        return null;
                    });
                    if (!msgs || msgs.size === 0) break;

                    const paraApagar = msgs.filter(m =>
                        m.author.id === user.id &&
                        m.createdTimestamp >= dataInicio.getTime()
                    );

                    if (paraApagar.size > 0) {
                        const apagadas = await canal.bulkDelete(paraApagar, true).catch(err => {
                            console.log(`[ERRO DELETE] #${canal.name}: ${err.message}`);
                            return null;
                        });
                        if (apagadas) {
                            total += apagadas.size;
                            await statusMsg.edit(`🗑️ Apagando... **${total} mensagens** encontradas`);
                        }
                    }

                    if (msgs.size < 100) break;
                    ultimaId = msgs.last().id;

                    // Evita rate limit
                    await new Promise(r => setTimeout(r, 1100));
                }
            }

            statusMsg.edit(`✅ **Concluído!** Apaguei **${total} mensagens** de ${user} desde **${dataInicio.toLocaleString('pt-PT')}**`);
            console.log(`[SUCESSO] Apaguei ${total} mensagens de ${user.user.tag}`);
        } catch (err) {
            statusMsg.edit(`❌ Erro inesperado: ${err.message}`);
            console.error(`[ERRO FATAL] ${err}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`[ERRO LOGIN] Token inválido ou problema de conexão: ${err.message}`);
});
