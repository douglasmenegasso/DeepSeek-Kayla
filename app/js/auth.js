// ============ AUTENTICAÇÃO (Versão Final - Sem bloqueio offline) ============

function mostrarTelaSelecao() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function abrirLogin() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔐 Login</div>';
    html += '<div class="modal-sub">Digite suas credenciais</div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="checkbox-group"><input type="checkbox" id="lembrar-me"><label for="lembrar-me" style="color:var(--text2);font-size:13px">Lembrar de mim</label></div>';
    html += '<div style="text-align:right;margin-bottom:12px"><button class="btn btn-sm btn-outline" onclick="recuperarSenha()" style="width:auto;padding:6px 12px;font-size:11px">🔑 Esqueci a senha</button></div>';
    html += '<button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('email').focus(); }, 100);
}

function abrirCadastro() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📝 Criar Conta</div>';
    html += '<div class="modal-sub">Preencha seus dados</div>';
    html += '<div class="form-group"><label class="form-label">Nome</label><input class="form-input" id="cadastro-nome" placeholder="Seu nome"></div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="cadastro-email" type="email" placeholder="seu@email.com"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="cadastro-senha" type="password" placeholder="Mínimo 6 caracteres"></div>';
    html += '<div class="form-group"><label class="form-label">Confirmar Senha</label><input class="form-input" id="cadastro-senha2" type="password" placeholder="Repita a senha"></div>';
    html += '<button class="btn btn-primary" onclick="fazerCadastro()">Cadastrar</button>';
    html += '<button class="btn btn-outline" onclick="abrirLogin()">Já tenho conta</button>';
    html += '<button class="btn btn-outline" onclick="mostrarTelaSelecao()">Voltar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function verificarSessao() {
    var lembrarMe = localStorage.getItem('kayla_lembrar_me');
    
    if (lembrarMe === 'true') {
        var emailSalvo = localStorage.getItem('kayla_email');
        var userSalvo = localStorage.getItem('kayla_user');
        
        if (userSalvo) {
            try {
                var usuarioLocal = JSON.parse(userSalvo);
                currentUser = usuarioLocal;

                // ✅ SEGURANÇA: Verifica usuário APENAS se estiver ONLINE
                if (isOnline && supabaseClient && usuarioLocal.id) {
                    var { data: usuarioBanco, error } = await supabaseClient
                        .from('auth.users')
                        .select('id')
                        .eq('id', usuarioLocal.id)
                        .maybeSingle();

                    // Se o usuário não existir no banco, força logout no Supabase e local
                    if (error || !usuarioBanco) {
                        console.warn('[SEGURANÇA] Usuário salvo não encontrado no banco. Realizando logout forçado.');
                        
                        // Força logout no Supabase
                        if (supabaseClient) {
                            try {
                                await supabaseClient.auth.signOut();
                            } catch (e) {
                                console.warn('Erro ao fazer logout forçado no Supabase:', e);
                            }
                        }
                        
                        realizarLogoutForcado();
                        return;
                    }
                    
                    // Se passou na verificação, atualiza a data do último login
                    localStorage.setItem('kayla_last_login', new Date().toISOString());
                }
                
                // ✅ Verifica se ainda tem dispositivos ativos (se estiver online)
                if (isOnline && supabaseClient && currentUser) {
                    try {
                        var assinatura = await getAssinaturaAtiva();
                        if (assinatura) {
                            var countResult = await supabaseClient
                                .from('dispositivos')
                                .select('id', { count: 'exact', head: true })
                                .eq('assinatura_id', assinatura.id)
                                .eq('ativo', true);
                            
                            // Se não houver mais dispositivos ativos, derruba o PRO do localStorage
                            if (countResult.count === 0 && !LIMITES.proAtivo) {
                                localStorage.removeItem('kayla_pro');
                                localStorage.removeItem('kayla_pro_key');
                                localStorage.removeItem('kayla_pro_expires');
                                localStorage.removeItem('kayla_pro_devices');
                                LIMITES.proAtivo = false;
                            }
                        }
                    } catch(e) {
                        console.warn('Erro ao verificar dispositivos na sessão:', e);
                    }
                }
                
                // Carrega os dados e mostra o app (SEMPRE, mesmo offline)
                if (isOnline && supabaseClient) {
                    try {
                        await carregarDados();
                    } catch(e) {
                        console.warn('Falha ao sincronizar, usando dados locais');
                    }
                } else {
                    carregarDadosLocais();
                }
                
                mostrarApp();
                return;
                
            } catch(e) {
                console.error('Erro ao restaurar sessão:', e);
                // Se der erro ao ler o JSON, apaga e manda pro login
                localStorage.removeItem('kayla_user');
                localStorage.removeItem('kayla_email');
                localStorage.removeItem('kayla_lembrar_me');
                mostrarTelaSelecao();
            }
        }
    }
    
    mostrarTelaSelecao();
}

// Função auxiliar para realizar logout forçado
function realizarLogoutForcado() {
    localStorage.removeItem('kayla_lembrar_me');
    localStorage.removeItem('kayla_email');
    localStorage.removeItem('kayla_user');
    localStorage.removeItem('kayla_access_token');
    localStorage.removeItem('kayla_refresh_token');
    localStorage.removeItem('kayla_last_login');
    localStorage.removeItem('kayla_pro');
    localStorage.removeItem('kayla_pro_key');
    localStorage.removeItem('kayla_pro_expires');
    localStorage.removeItem('kayla_pro_devices');
    currentUser = null;
    LIMITES.proAtivo = false;
    mostrarTelaSelecao();
}

async function fazerLogin() {
    var email = document.getElementById('email').value.trim();
    var senha = document.getElementById('senha').value;
    var lembrarMe = document.getElementById('lembrar-me').checked;
    
    if (!email || !senha) { 
        toast('Preencha e-mail e senha', 'error'); 
        return; 
    }
    
    var btn = event ? event.target : document.querySelector('button[onclick="fazerLogin()"]');
    var textoOriginal = btn ? btn.innerText : 'Entrar';
    
    if (btn) {
        btn.innerText = 'Entrando...';
        btn.disabled = true;
    }
    
    console.log('[AUTH] Tentando login - Email:', email, 'Online:', isOnline);
    
    // Verifica sessão salva OFF-LINE
    var userSalvo = localStorage.getItem('kayla_user');
    var emailSalvo = localStorage.getItem('kayla_email');
    
    // Tenta login ONLINE
    if (supabaseClient) {
        console.log('[AUTH] Login ONLINE via Supabase');
        
        try {
            var result = await supabaseClient.auth.signInWithPassword({ 
                email: email, 
                password: senha 
            });
            
            console.log('[AUTH] Resultado Supabase:', result);
            
            if (result.error) {
                var errorMsg = result.error.message || 'Erro desconhecido';
                
                // Se der erro, tenta login OFFLINE como fallback
                if (userSalvo && emailSalvo === email) {
                    console.log('[AUTH] Falha online, tentando offline...');
                    toast('Sem conexão. Tentando login offline...', 'warning');
                    
                    try {
                        var userOffline = JSON.parse(userSalvo);
                        currentUser = userOffline;
                        
                        if (lembrarMe) {
                            localStorage.setItem('kayla_lembrar_me', 'true');
                            localStorage.setItem('kayla_email', email);
                        }
                        
                        carregarDadosLocais();
                        fecharModal();
                        toast('Bem-vindo (Offline)!', 'success');
                        mostrarApp();
                        atualizarBadgePlano();
                        
                        if (btn) {
                            btn.innerText = textoOriginal;
                            btn.disabled = false;
                        }
                        return;
                    } catch(e) {
                        console.error('[AUTH] Erro no fallback offline:', e);
                    }
                }
                
                // ✅ SE ESTIVER ONLINE E DER ERRO, SUGERE O CADASTRO AUTOMATICAMENTE
                if (isOnline) {
                    var erroSenha = errorMsg.toLowerCase().includes('invalid login credentials') || 
                                     errorMsg.toLowerCase().includes('bad request');

                    if (erroSenha) {
                        toast('E-mail não encontrado. Vamos criar sua conta agora?', 'warning');
                        fecharModal(); // Fecha o modal de login
                        
                        // Aguarda 1 segundo e abre o modal de cadastro
                        setTimeout(function() {
                            abrirCadastro();
                        }, 1000);
                        
                        if (btn) {
                            btn.innerText = textoOriginal;
                            btn.disabled = false;
                        }
                        return;
                    } else {
                        toast('Erro: ' + errorMsg, 'error');
                    }
                } else {
                    toast('Erro de conexão. Verifique sua internet.', 'error');
                }
                
                console.error('[AUTH] Erro login:', result.error);
                
                if (btn) {
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                }
                return;
            }
            
            // Login online sucesso
            if (result.data && result.data.user) {
                // Salva sessão SEM senha
                var session = result.data.session;
                if (session) {
                    localStorage.setItem('kayla_access_token', session.access_token);
                    localStorage.setItem('kayla_refresh_token', session.refresh_token);
                }
                
                await loginSucesso(result.data.user, lembrarMe);
            } else {
                toast('Erro ao fazer login', 'error');
            }
            
        } catch(error) {
            console.error('[AUTH] Exceção no login:', error);
            
            // Se der erro de conexão, tenta offline
            if (userSalvo && emailSalvo === email) {
                console.log('[AUTH] Exceção online, tentando offline...');
                toast('Sem conexão. Tentando login offline...', 'warning');
                
                try {
                    var userOffline = JSON.parse(userSalvo);
                    currentUser = userOffline;
                    
                    if (lembrarMe) {
                        localStorage.setItem('kayla_lembrar_me', 'true');
                        localStorage.setItem('kayla_email', email);
                    }
                    
                    carregarDadosLocais();
                    fecharModal();
                    toast('Bem-vindo (Offline)!', 'success');
                    mostrarApp();
                    atualizarBadgePlano();
                    
                    if (btn) {
                        btn.innerText = textoOriginal;
                        btn.disabled = false;
                    }
                    return;
                } catch(e) {
                    console.error('[AUTH] Erro no fallback offline:', e);
                }
            }
            
            toast('Erro de conexão: ' + error.message, 'error');
        }
    } else {
        toast('Serviço de autenticação indisponível', 'error');
    }
    
    if (btn) {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}
async function loginSucesso(user, lembrarMe) {
    console.log('[AUTH] Login sucesso:', user.email);
    
    currentUser = user;
    
    try {
        localStorage.setItem('kayla_user', JSON.stringify(user));
        localStorage.setItem('kayla_email', user.email);
        localStorage.setItem('kayla_last_login', new Date().toISOString());
        
        if (lembrarMe) {
            localStorage.setItem('kayla_lembrar_me', 'true');
        }
        
        console.log('[AUTH] Sessão salva no localStorage');
    } catch(e) {
        console.error('[AUTH] Erro ao salvar sessão:', e);
    }
    
    if (isOnline && supabaseClient) {
        console.log('[AUTH] Carregando dados online...');
        await carregarDados();
    } else {
        console.log('[AUTH] Carregando dados offline...');
        carregarDadosLocais();
    }

    // Verifica se o usuário tem assinatura PRO no Supabase
    await verificarStatusPro(); 
    
    fecharModal();
    toast('Bem-vindo!', 'success');
    mostrarApp();
    atualizarBadgePlano();
    
    console.log('[AUTH] Login completo!');
}

async function fazerLogout() {
    console.log('[AUTH] Logout iniciado');
    
    if (supabaseClient && isOnline) {
        try {
            await supabaseClient.auth.signOut();
        } catch(e) {
            console.warn('[AUTH] Erro ao fazer logout no Supabase:', e);
        }
    }
    
    localStorage.removeItem('kayla_lembrar_me');
    localStorage.removeItem('kayla_email');
    localStorage.removeItem('kayla_user');
    localStorage.removeItem('kayla_access_token');
    localStorage.removeItem('kayla_refresh_token');
    localStorage.removeItem('kayla_last_login');
    localStorage.removeItem('kayla_pro');
    localStorage.removeItem('kayla_pro_key');
    localStorage.removeItem('kayla_pro_expires');
    localStorage.removeItem('kayla_pro_devices');
    localStorage.removeItem('perfilAcesso');
    
    currentUser = null;
    clienteAtual = null;
    pedidoItens = [];
    LIMITES.proAtivo = false;
    
    toast('Logout realizado', 'success');
    
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    console.log('[AUTH] Logout completo');
}

async function carregarDados() {
    if (!currentUser) return;
    
    if (isOnline && supabaseClient) {
        try {
            var userId = currentUser.id;
            var r;
            
            r = await supabaseClient.from('clientes').select('*').eq('user_id', userId).order('nome');
            if (!r.error) { clientes = r.data || []; salvarDadosLocais(); }
            
            r = await supabaseClient.from('produtos').select('*').eq('user_id', userId).order('nome');
            if (!r.error) { produtos = r.data || []; salvarDadosLocais(); }
            
            r = await supabaseClient.from('pedidos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (!r.error) { pedidos = r.data || []; salvarDadosLocais(); }
            
            lastSync = new Date().toISOString();
            localStorage.setItem('kayla_last_sync', lastSync);
            
        } catch(e) {
            console.error('Erro ao sincronizar:', e);
            carregarDadosLocais();
        }
    } else {
        carregarDadosLocais();
    }
}

async function sincronizarDados() {
    if (!isOnline || !currentUser) return;
    toast('🔄 Sincronizando...', 'warning');
    await carregarDados();
    toast('✅ Dados sincronizados!', 'success');
}

// ============ RECUPERAÇÃO DE SENHA ============

function recuperarSenha() {
    var email = document.getElementById('email').value.trim();
    
    if (!email) {
        toast('Digite seu e-mail', 'warning');
        document.getElementById('email').focus();
        return;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast('E-mail inválido', 'error');
        return;
    }
    
    confirmar('Recuperar Senha', 'Será enviado um link de recuperação para:\n\n' + email + '\n\nDeseja continuar?', function(confirmed) {
        if (!confirmed) return;
        
        (async function() {
            try {
                if (supabaseClient) {
                    var result = await supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/app/reset-password.html'
                    });
                    
                    if (result.error) {
                        toast('Erro: ' + result.error.message, 'error');
                    } else {
                        toast('✅ E-mail de recuperação enviado!\n\nVerifique sua caixa de entrada e spam.', 'success');
                        fecharModal();
                    }
                } else {
                    toast('⚠️ Modo offline\n\nEm produção, o e-mail seria enviado para: ' + email, 'warning');
                }
            } catch(e) {
                toast('Erro de conexão: ' + e.message, 'error');
                console.error('Erro na recuperação:', e);
            }
        })();
    });
}

// Verifica se o usuário está logado automaticamente ao carregar a página
window.addEventListener('DOMContentLoaded', function() {
    // Se tiver token de acesso salvo, tenta restaurar sessão
    var accessToken = localStorage.getItem('kayla_access_token');
    if (accessToken && supabaseClient) {
        supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: localStorage.getItem('kayla_refresh_token') || ''
        }).then(function(result) {
            if (result.data && result.data.session) {
                verificarSessao();
            }
        }).catch(function(e) {
            console.warn('Erro ao restaurar sessão via token:', e);
            verificarSessao();
        });
    } else {
        verificarSessao();
    }
});

console.log('✅ Auth.js carregado (Versão Final - Sem bloqueio offline)');
