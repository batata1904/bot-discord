if (comando === 'clearuser') {
    console.log(`[COMANDO] ${message.author.tag} usou !clearuser em #${message.channel.name}`);

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
    if (isNaN(dataInicio.getTime())) return message.reply('❌ Data inválida!');

    console.log(`[BUSCA] Procurando mensagens de ${user.user.tag} desde ${dataInicio.toLocaleString('pt-PT')}`);

    let total = 0;
    const statusMsg = await message.channel.send(`🔍 Procurando mensagens de **${user.displayName}**...`);

    try {
        for (const [id, canal] of message.guild.channels.cache) {
            if (canal.type !== 0) continue;

            const perms = canal.permissionsFor(client.user);
            if (!perms || !perms.has(['ViewChannel', 'ReadMessageHistory', 'ManageMessages'])) {
                console.log(`[SEM PERMISSÃO] #${canal.name}`);
                continue;
            }

            console.log(`[VERIFICANDO] #${canal.name}`);

            let ultimaId;
            let encontrou = false;
            while (true) {
                const opcoes = { limit: 100 };
                if (ultimaId) opcoes.before = ultimaId;

                const msgs = await canal.messages.fetch(opcoes).catch(() => null);
                if (!msgs || msgs.size === 0) break;

                const paraApagar = msgs.filter(m =>
                    m.author.id === user.id &&
                    m.createdTimestamp >= dataInicio.getTime()
                );

                if (paraApagar.size > 0) {
                    encontrou = true;
                    const apagadas = await canal.bulkDelete(paraApagar, true).catch(err => {
                        console.log(`[ERRO APAGAR] #${canal.name}: ${err.message}`);
                        return null;
                    });
                    if (apagadas) {
                        total += apagadas.size;
                        await statusMsg.edit(`🗑️ Apagando... **${total} mensagens** encontradas`);
                    }
                }

                if (msgs.size < 100) break;
                ultimaId = msgs.last().id;
                await new Promise(r => setTimeout(r, 1100));
            }

            if (encontrou) console.log(`[ENCONTRADO] Mensagens em #${canal.name}`);
        }

        if (total === 0) {
            statusMsg.edit(`⚠️ **Nenhuma mensagem encontrada** de ${user} desde **${dataInicio.toLocaleString('pt-PT')}**`);
            console.log(`[ZERO] Nenhuma mensagem encontrada`);
        } else {
            statusMsg.edit(`✅ **Concluído!** Apaguei **${total} mensagens** de ${user}`);
            console.log(`[SUCESSO] Apaguei ${total} mensagens`);
        }
    } catch (err) {
        statusMsg.edit(`❌ Erro: ${err.message}`);
        console.error(`[ERRO FATAL] ${err}`);
    }
}
