const { Client, GatewayIntentBits, Events, PermissionsBitField } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot 24/7'));
app.listen(PORT, () => console.log(`Web na porta ${PORT}`));

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
    const guild = client.guilds.cache.first();
    console.log(`\n=== BOT ONLINE ===`);
    console.log(`Bot: ${client.user.tag}`);
    console.log(`Servidor: ${guild.name} (ID: ${guild.id})`);
    console.log(`Membros: ${guild.memberCount}`);
    console.log(`Canais totais: ${guild.channels.cache.size}`);

    const canaisTexto = guild.channels.cache.filter(c => c.type === 0);
    console.log(`\n=== CANAIS DE TEXTO (${canaisTexto.size}) ===`);
    canaisTexto.forEach(c => {
        const perms = c.permissionsFor(client.user);
        const view = perms?.has('ViewChannel') ? '✅' : '❌';
        const read = perms?.has('ReadMessageHistory') ? '✅' : '❌';
        const manage = perms?.has('ManageMessages') ? '✅' : '❌';
        console.log(`#${c.name} (ID: ${c.id}) | View: ${view} | Read: ${read} | Manage: ${manage}`);
    });
});

client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    if (comando === 'clearuser') {
        console.log(`\n=== NOVO COMANDO !clearuser ===`);
        console.log(`Usuário: ${message.author.tag}`);
        console.log(`Canal: #${message.channel.name}`);

        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const temCargo = message.member.roles.cache.some(r => r.name === cargoPermitido);
        if (!isAdmin && !temCargo) {
            console.log(`[ERRO] Sem permissão`);
            return message.reply('❌ Apenas Admins ou Nobreza!');
        }

        const user = message.mentions.members.first();
        if (!user) return message.reply('❌ Marca um usuário!');

        const [dia, mes, ano] = args[1].split('-');
        const [hora, min] = args[2].split(':');
        const dataInicio = new Date(`${ano}-${mes}-${dia}T${hora}:${min}:00`);
        if (isNaN(dataInicio.getTime())) return message.reply('❌ Data inválida!');

        console.log(`[BUSCA] Desde: ${dataInicio.toLocaleString('pt-PT')}`);

        let total = 0;
        const statusMsg = await message.channel.send(`Iniciando varredura...`);

        try {
            const canais = message.guild.channels.cache.filter(c => c.type === 0);
            console.log(`[VARREDURA] ${canais.size} canais de texto`);

            for (const canal of canais.values()) {
                console.log(`\n[ANALISANDO] #${canal.name} (ID: ${canal.id})`);

                const perms = canal.permissionsFor(client.user);
                if (!perms) {
                    console.log(`[ERRO] Bot não tem acesso a este canal`);
                    continue;
                }

                const view = perms.has('ViewChannel');
                const read = perms.has('ReadMessageHistory');
                const manage = perms.has('ManageMessages');

                console.log(`[PERMISSÕES] View: ${view} | Read: ${read} | Manage: ${manage}`);

                if (!view || !read || !manage) {
                    console.log(`[PULADO] Falta permissão`);
                    continue;
                }

                await statusMsg.edit(`Verificando **#${canal.name}**...`);

                let ultimaId;
                let localTotal = 0;
                while (true) {
                    const opcoes = { limit: 50 };
                    if (ultimaId) opcoes.before = ultimaId;

                    const msgs = await canal.messages.fetch(opcoes).catch(err => {
                        console.log(`[ERRO FETCH] ${err.message}`);
                        return null;
                    });
                    if (!msgs || msgs.size === 0) break;

                    const paraApagar = msgs.filter(m =>
                        m.author.id === user.id &&
                        m.createdTimestamp >= dataInicio.getTime()
                    );

                    if (paraApagar.size > 0) {
                        const apagadas = await canal.bulkDelete(paraApagar, true).catch(err => {
                            console.log(`[ERRO DELETE] ${err.message}`);
                            return null;
                        });
                        if (apagadas) {
                            localTotal += apagadas.size;
                            total += apagadas.size;
                            await statusMsg.edit(`Apagando... **${total} mensagens**`);
                        }
                    }

                    if (msgs.size < 50) break;
                    ultimaId = msgs.last().id;
                    await new Promise(r => setTimeout(r, 1200));
                }

                if (localTotal > 0) console.log(`[APAGADO] ${localTotal} em #${canal.name}`);
            }

            statusMsg.edit(total === 0 ? `Nenhuma mensagem encontrada.` : `Apaguei **${total} mensagens**!`);
            console.log(`[FINAL] Total apagado: ${total}`);
        } catch (err) {
            statusMsg.edit(`Erro: ${err.message}`);
            console.error(`[FATAL] ${err}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error(`[LOGIN FALHOU] ${err.message}`);
});
