// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 50,
    maxProdutos: 100,
    maxVendas: 200
};

// ============ FUNÇÃO AUXILIAR (Copiada do payment.js para evitar erro) ============

async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) {
        return null;
    }
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (result.error) {
            console.warn('[getAssinaturaAtiva] Erro:', result.error);
            return null;
        }
        return result.data;
    } catch(e) {
        console.error('[getAssinaturaAtiva] Erro:', e);
        return null;
    }
}

// ============ CANCELAMENTO DE ASSINATURA PRO ============

async function cancelarAssinatura() {
    if (!currentUser) { toast('Faça login primeiro.', 'error'); return; }
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) { toast('Você não possui uma assinatura PRO ativa.', 'error'); return; }
    if (!confirm('⚠️ ATENÇÃO!\nVocê está prestes a CANCELAR sua assinatura PRO.\nIsso desativará todos os seus dispositivos e você perderá acesso aos recursos PRO.\n\nDeseja continuar?')) return;
    try {
        await supabaseClient.from('assinaturas').update({ status: 'cancelada' }).eq('id', assinatura.id);
        await supabaseClient.from('dispositivos').update({ ativo: false }).eq('assinatura_id', assinatura.id);
        localStorage.removeItem('kayla_pro'); localStorage.removeItem('kayla_pro_key'); localStorage.removeItem('kayla_pro_expires'); localStorage.removeItem('kayla_pro_devices');
        LIMITES.proAtivo = false; atualizarBadgePlano(); if (typeof mudarAba === 'function') mudarAba('settings');
        toast('✅ Assinatura PRO cancelada com sucesso!', 'success');
    } catch(e) { toast('❌ Erro ao cancelar assinatura', 'error'); }
}

// ============ EXCLUSÃO DEFINITIVA DE CONTA (LGPD) ============

async function excluirConta() {
    if (!currentUser || !supabaseClient) { toast('Nenhum usuário logado.', 'error'); return; }
    
    // 🔒 1ª Confirmação (Modal do App - dupla confirmação)
    confirmar('Excluir Conta', 'Ao confirmar, TODOS os seus dados (cadastro, clientes, produtos, pedidos) serão EXCLUÍDOS PERMANENTEMENTE.\n\nEsta ação é IRREVERSÍVEL de acordo com a LGPD.', async function(confirmou1) {
        if (!confirmou1) return;

        // 🔒 2ª Confirmação (Modal do App)
        confirmar('Última Chance!', 'Você tem certeza absoluta que deseja deletar sua conta?\n\nNão há como recuperar essas informações.', async function(confirmou2) {
            if (!confirmou2) return;
            
            try {
                var response = await fetch('https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                var resultado = await response.json();
                
                if (resultado.success) {
                    await supabaseClient.auth.signOut();
                    localStorage.clear();
                    currentUser = null;
                    LIMITES.proAtivo = false;
                    mostrarTelaSelecao();
                    toast('✅ Dados excluídos com sucesso!', 'success');
                } else {
                    toast('❌ Erro: ' + resultado.error, 'error');
                }
            } catch (e) {
                toast('Erro de conexão.', 'error');
            }
        });
    });
}

// ============ VERIFICAR STATUS PRO ============

async function verificarStatusPro() {
    if (!currentUser || !supabaseClient) {
        return false;
    }
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (result.error || !result.data) {
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            return false;
        }
        var assinatura = result.data;
        if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            await supabaseClient.from('assinaturas').update({ status: 'expirada' }).eq('id', assinatura.id);
            return false;
        }
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
        localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
        localStorage.setItem('kayla_pro_devices', assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max);
        return true;
    } catch(e) {
        console.error('[Pro] Erro ao verificar status:', e);
        return false;
    }
}

// ============ ATUALIZAR BADGE DO PLANO ============

function atualizarBadgePlano() {
    var badge = document.getElementById('plan-badge');
    if (!badge) return;
    if (LIMITES.proAtivo) {
        badge.textContent = 'PRO';
        badge.className = 'badge-pro';
    } else {
        badge.textContent = 'GRÁTIS';
        badge.className = 'badge-free';
    }
}

// ============ VERIFICAR LIMITES ============

function verificarLimite(tipo) {
    if (LIMITES.proAtivo) return true;
    var limite = 0;
    var atual = 0;
    switch(tipo) {
        case 'clientes': limite = LIMITES.maxClientes; atual = (window.clientes || []).length; break;
        case 'produtos': limite = LIMITES.maxProdutos; atual = (window.produtos || []).length; break;
        case 'vendas': limite = LIMITES.maxVendas; atual = (window.vendas || []).length; break;
    }
    if (atual >= limite) return false;
    return true;
}

console.log('✅ Subscription.js carregado');
