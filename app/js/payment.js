async function cancelarDispositivos(novosDispositivos) {
    if (!currentUser) { toast('Faça login primeiro', 'error'); return; }
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) { toast('Nenhuma assinatura ativa encontrada', 'error'); return; }
    if (novosDispositivos >= assinatura.dispositivos_max) { toast('Você só pode reduzir o número de dispositivos.', 'warning'); return; }
    
    var dispositivosRemovidos = assinatura.dispositivos_max - novosDispositivos;
    // ✅ CORREÇÃO AQUI: Calcula o crédito com base em apenas 1 mês (não multiplica pelos meses restantes)
    var valorCredito = dispositivosRemovidos * 5; 
    valorCredito = Math.round(valorCredito * 100) / 100;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📉 Reduzir Dispositivos</div>';
    html += '<div class="modal-sub">Removendo <strong>' + dispositivosRemovidos + '</strong> dispositivo(s) (de ' + assinatura.dispositivos_max + ' para ' + novosDispositivos + ')</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;padding-top:0px;border-top:0px;align-items:center">';
    html += '<div style="display:flex;flex-direction:column;align-items:flex-start">';
    html += '<span style="font-weight:700;font-size:16px;color:var(--success)">Crédito a receber:</span>';
    html += '<span style="font-size:11px;color:var(--text2);margin-top:4px">* Crédito referente ao mês atual (R$ 5,00 por dispositivo)</span>';
    html += '</div>';
    html += '<strong style="color:var(--success);font-size:20px">R$ ' + valorCredito.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="confirmarCancelamentoDispositivos(' + novosDispositivos + ', ' + valorCredito + ', \'' + assinatura.id + '\')">✅ Confirmar Redução</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html; document.getElementById('modal-overlay').classList.add('show');
}
