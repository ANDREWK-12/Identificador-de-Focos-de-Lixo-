const mapR = L.map('mapa-relatorio').setView([-1.4090, -48.4350], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapR);

let chartInstance = null;
let currentDias = 30;
const pendingDeletes = {}; // id -> {item, timeout}

// Popula o select de bairros com valores únicos encontrados nas denúncias
function populateBairroFilter() {
    const select = document.getElementById('filter-bairro');
    if (!select) return;
    const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
    // coleta nomes normalizados (trim) para evitar problemas com espaços/case
    const unique = new Set(dados.map(d => (d.bairro || 'Outros').toString().trim()));
    // preservar seleção atual
    const current = select.value || 'all';
    select.innerHTML = '<option value="all">Todos os bairros</option>';
    Array.from(unique).sort((a,b) => a.localeCompare(b, 'pt-BR')).forEach(b => {
        const escaped = b.replace(/"/g, '&quot;');
        select.innerHTML += `<option value="${escaped}">${b}</option>`;
    });
    // tentar restaurar seleção se ainda existir
    if (Array.from(select.options).some(o => o.value === current)) select.value = current;
}

function gerarRelatorio(dias = 30, bairroFilter = 'all') {
    currentDias = dias;
    const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
    const agora = Date.now();
    const limiteTempo = dias * 24 * 60 * 60 * 1000;

    // Filtra denúncias pelo período selecionado
    // Normaliza timestamp: aceita d.id como number, string number, ISO string, ou usa d.horario
    function tryParseDateString(s) {
        if (!s) return NaN;
        // tentativa direta (ISO e formatos compreendidos pelo Date.parse)
        const p = Date.parse(s);
        if (!isNaN(p)) return p;

        // tentar formatos comuns BR: dd/mm/yyyy ou dd/mm/yyyy hh:mm
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
        if (m) {
            const day = parseInt(m[1],10), month = parseInt(m[2],10) - 1, year = parseInt(m[3],10);
            const hour = m[4] ? parseInt(m[4],10) : 0;
            const min = m[5] ? parseInt(m[5],10) : 0;
            return new Date(year, month, day, hour, min).getTime();
        }

        return NaN;
    }

    function getTimestamp(d) {
        if (!d) return 0;
        // Prioriza o campo 'horario' (data real da foto) quando disponível
        if (d.horario) {
            const ph = tryParseDateString(d.horario);
            if (!isNaN(ph)) return ph;
        }

        // Em seguida, verifica d.id em vários formatos
        if (typeof d.id === 'number' && !isNaN(d.id)) return d.id;
        if (typeof d.id === 'string' && /^\d+$/.test(d.id)) return parseInt(d.id, 10);
        if (typeof d.id === 'string') {
            const p = Date.parse(d.id);
            if (!isNaN(p)) return p;
        }

        return 0;
    }

    let filtrados = dados.filter(d => {
        const ts = getTimestamp(d);
        if (!ts) return false; // sem timestamp válido, não incluir
        return (agora - ts) <= limiteTempo;
    });

    // Aplica filtro por bairro se necessário
    if (bairroFilter && bairroFilter !== 'all') {
        const wanted = bairroFilter.toString().trim();
        filtrados = filtrados.filter(d => ((d.bairro || 'Outros') + '').toString().trim() === wanted);
    }

    const stats = {};
    const corpoTabela = document.getElementById('corpo-tabela');
    corpoTabela.innerHTML = "";

    // Limpa círculos antigos do mapa (exceto tiles)
    mapR.eachLayer((layer) => {
        if (layer instanceof L.Circle) mapR.removeLayer(layer);
    });

    filtrados.forEach(d => {
        // Adiciona círculo de calor no mapa
        L.circle([d.lat, d.lon], {color: 'red', radius: 250}).addTo(mapR);
        
        // Agrupa estatísticas por bairro individual
        const bairro = d.bairro || "Outros";
        if (!stats[bairro]) stats[bairro] = {qtd: 0, confTotal: 0};
        stats[bairro].qtd++;
        stats[bairro].confTotal += parseFloat(d.confianca);
    });

    const labels = Object.keys(stats);
    const valores = labels.map(l => stats[l].qtd);

    // Preenche a tabela
    labels.forEach(l => {
        const media = (stats[l].confTotal / stats[l].qtd).toFixed(1);
        corpoTabela.innerHTML += `<tr><td>${l}</td><td><b>${stats[l].qtd}</b></td><td>${media}%</td></tr>`;
    });

    // Lista detalhada de denúncias (tabela)
    const lista = document.getElementById('lista-denuncias');
    if (lista) {
        lista.innerHTML = '';
        // ordena do mais recente para o mais antigo
        const ordenado = filtrados.sort((a,b) => (getTimestamp(b) - getTimestamp(a)));
        ordenado.forEach(d => {
            const ts = getTimestamp(d);
            const dateUsed = ts ? new Date(ts).toLocaleString('pt-BR') : '—';
            const coordsTxt = `${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}`;
            const idVal = d.id;
            const thumbSrc = d.thumb ? d.thumb : '';
            const reporter = d.reporter ? escapeHtml(d.reporter) : '—';
            const resolved = d.resolved ? `<span style="color:green">✅ Resolvido</span>` : `<span style="color:#e74c3c">❌ Não</span>`;
            lista.innerHTML += `<tr>
                <td style="width:80px; text-align:center"><img class="thumb lazy" data-src="${thumbSrc}" alt="miniatura" onclick="openPhotoModalRel('${idVal}')" /></td>
                <td style="white-space:nowrap">${dateUsed}</td>
                <td style="white-space:nowrap">${d.bairro || 'Outros'}</td>
                <td style="text-align:center">${parseFloat(d.confianca).toFixed(1)}%</td>
                <td style="white-space:nowrap">${coordsTxt}</td>
                <td style="white-space:nowrap">${reporter}</td>
                <td style="white-space:nowrap">${resolved}</td>
            </tr>`;
        });
    }

    // inicializa lazy-loading para miniaturas (substitui data-src por src quando visíveis)
    try { initLazyLoad(); } catch(e) { /* ignore */ }

    // Atualiza o gráfico do Chart.js
    const ctx = document.getElementById('graficoBairros').getContext('2d');
    if (chartInstance) chartInstance.destroy(); // Necessário para não bugar o gráfico ao filtrar
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Focos de Lixo (${dias} dias)`,
                data: valores,
                backgroundColor: '#27ae60',
                borderColor: '#2c3e50',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function gerarRelatorioWithControls(dias) {
    const bairro = document.getElementById('filter-bairro')?.value || 'all';
    // repopula bairros antes de gerar para garantir opções atualizadas
    populateBairroFilter();
    gerarRelatorio(dias, bairro);
}

// inicializa filtros e relatório
populateBairroFilter();
document.getElementById('filter-bairro')?.addEventListener('change', () => gerarRelatorioWithControls(currentDias));
document.getElementById('btn-refresh-filtros')?.addEventListener('click', () => { populateBairroFilter(); gerarRelatorioWithControls(currentDias); });
// Inicia com 30 dias por padrão
gerarRelatorioWithControls(30);

// reagir quando o usuário logar/deslogar
document.addEventListener('ecolog-auth-changed', () => {
    populateBairroFilter();
    gerarRelatorioWithControls(currentDias);
});

// Centraliza o mapa no ponto selecionado da lista de denúncias
function vistaDenuncia(lat, lon) {
    mapR.setView([lat, lon], 16);
}

// Excluir denúncia por id (string/number). Confirma e re-renderiza o relatório.
function excluirDenuncia(id) {
    try {
        // remove imediatamente, mas guarda o item em pendingDeletes com timeout para desfazer
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        const idx = dados.findIndex(d => String(d.id) === String(id));
        if (idx === -1) return alert('Denúncia não encontrada');
        const item = dados[idx];
        // remove do array e salva
        const novos = dados.filter((d, i) => i !== idx);
        localStorage.setItem('denuncias', JSON.stringify(novos));
        populateBairroFilter();
        gerarRelatorioWithControls(currentDias);

        // cria toast com desfazer
        const timeoutMs = 6000;
        const t = setTimeout(() => { delete pendingDeletes[id]; }, timeoutMs + 100);
        pendingDeletes[id] = { item: item, timeout: t };
        showToast(`Denúncia removida.`, () => undoDelete(id), id, timeoutMs);
    } catch (e) {
        console.error('Erro ao excluir denúncia', e);
        alert('Não foi possível excluir a denúncia. Veja o console.');
    }
}

// Editar denúncia: abre um prompt simples para alterar o horário (rápido e seguro).
function editarDenuncia(id) {
    // abrir modal de edição
    const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
    const idx = dados.findIndex(d => String(d.id) === String(id));
    if (idx === -1) return alert('Denúncia não encontrada');
    const atual = dados[idx];
    // popular campos do modal
    const modal = document.getElementById('edit-modal');
    if (!modal) return alert('Modal de edição não encontrado');
    document.getElementById('edit-horario').value = atual.horario || '';
    document.getElementById('edit-bairro').value = atual.bairro || '';
    document.getElementById('edit-confianca').value = atual.confianca || '';
    const preview = document.getElementById('edit-thumb-preview');
    preview.innerHTML = atual.thumb ? `<img src="${atual.thumb}" style="max-width:120px; border-radius:8px;"/>` : '';
    modal.style.display = 'flex';
    modal.dataset.editId = String(id);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;
    modal.style.display = 'none';
    delete modal.dataset.editId;
}

function saveEditModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal || !modal.dataset.editId) return;
    const id = modal.dataset.editId;
    const horario = document.getElementById('edit-horario').value || '';
    const bairro = document.getElementById('edit-bairro').value || '';
    const confianca = document.getElementById('edit-confianca').value || '';

    // normaliza horario para ISO quando possível
    function normalizeToISO(s) {
        if (!s) return null;
        const p = Date.parse(s);
        if (!isNaN(p)) return new Date(p).toISOString();
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
        if (m) {
            const day = parseInt(m[1],10), month = parseInt(m[2],10)-1, year = parseInt(m[3],10);
            const hour = m[4] ? parseInt(m[4],10) : 0;
            const min = m[5] ? parseInt(m[5],10) : 0;
            return new Date(year, month, day, hour, min).toISOString();
        }
        return null;
    }

    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        const idx = dados.findIndex(d => String(d.id) === String(id));
        if (idx === -1) return alert('Denúncia não encontrada');
        const iso = normalizeToISO(horario);
        dados[idx].horario = iso || horario || dados[idx].horario;
        dados[idx].bairro = bairro || dados[idx].bairro;
        dados[idx].confianca = confianca || dados[idx].confianca;
        localStorage.setItem('denuncias', JSON.stringify(dados));
        closeEditModal();
        populateBairroFilter();
        gerarRelatorioWithControls(currentDias);
        showToast('Denúncia atualizada.', null, 'edit-success', 2500);
    } catch (e) {
        console.error('Erro ao salvar edição', e);
        alert('Erro ao salvar edição. Veja o console.');
    }
}

function undoDelete(id) {
    const entry = pendingDeletes[id];
    if (!entry) return;
    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        // re-inserir item no início (ou preservar ordem); aqui insere no início
        dados.unshift(entry.item);
        localStorage.setItem('denuncias', JSON.stringify(dados));
        clearTimeout(entry.timeout);
        delete pendingDeletes[id];
        populateBairroFilter();
        gerarRelatorioWithControls(currentDias);
        showToast('Exclusão desfeita.', null, 'undo-ok', 2200);
    } catch (e) { console.error('Erro ao desfazer exclusão', e); }
}

function showToast(msg, undoCallback, uid, duration = 6000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div style="flex:1">${msg}</div>`;
    if (typeof undoCallback === 'function') {
        const btn = document.createElement('button');
        btn.textContent = 'Desfazer';
        btn.addEventListener('click', () => { undoCallback(); container.removeChild(el); });
        el.appendChild(btn);
    }
    container.appendChild(el);
    const t = setTimeout(() => { if (container.contains(el)) container.removeChild(el); }, duration);
    return { element: el, timeout: t };
}
// Wire modal buttons (safe if elements exist)
document.addEventListener('DOMContentLoaded', () => {
    const btnCancel = document.getElementById('edit-cancel');
    const btnSave = document.getElementById('edit-save');
    const modal = document.getElementById('edit-modal');
    if (btnCancel) btnCancel.addEventListener('click', closeEditModal);
    if (btnSave) btnSave.addEventListener('click', saveEditModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeEditModal();
        });
    }
});

// Comprime um dataURL de imagem para uma nova dataURL com largura máxima e qualidade especificada
function compressImageDataUrl(dataUrl, maxWidth = 400, quality = 0.55) {
    return new Promise((resolve, reject) => {
        if (!dataUrl) return resolve(null);
        const img = new Image();
        img.onload = () => {
            try {
                const w = img.width, h = img.height;
                const ratio = h / w;
                const nw = Math.min(maxWidth, w);
                const nh = Math.round(nw * ratio);
                const off = document.createElement('canvas');
                off.width = nw;
                off.height = nh;
                const c = off.getContext('2d');
                c.drawImage(img, 0, 0, nw, nh);
                const out = off.toDataURL('image/jpeg', quality);
                resolve(out);
            } catch (e) { console.error('compressImageDataUrl error', e); resolve(dataUrl); }
        };
        img.onerror = (e) => { console.warn('Falha ao carregar imagem para compressão', e); resolve(dataUrl); };
        img.src = dataUrl;
    });
}

// Percorre as denúncias e otimiza as miniaturas (substitui no localStorage)
async function compressThumbs(maxWidth = 400, quality = 0.55) {
    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        if (!dados.length) return showToast('Nenhuma denúncia encontrada para otimizar.', null, 'opt-none', 3000);
        let changed = 0;
        for (let i = 0; i < dados.length; i++) {
            const d = dados[i];
            if (d.thumb) {
                const newThumb = await compressImageDataUrl(d.thumb, maxWidth, quality);
                if (newThumb && newThumb !== d.thumb) {
                    dados[i].thumb = newThumb;
                    changed++;
                }
            }
        }
        localStorage.setItem('denuncias', JSON.stringify(dados));
        populateBairroFilter();
        gerarRelatorioWithControls(currentDias);
        showToast(`Miniaturas otimizadas: ${changed}`, null, 'opt-done', 4000);
    } catch (e) {
        console.error('Erro ao otimizar miniaturas', e);
        showToast('Erro ao otimizar miniaturas. Veja console.', null, 'opt-err', 4000);
    }
}

// connect optimize button
document.addEventListener('DOMContentLoaded', () => {
    const btnOpt = document.getElementById('btn-optimize-thumbs');
    if (btnOpt) btnOpt.addEventListener('click', () => {
        if (!confirm('Reprocessar miniaturas para maior nitidez (pode aumentar uso do localStorage). Continuar?')) return;
        // agora melhora para 600px/0.75 para exibição mais nítida
        compressThumbs(600, 0.75);
    });
});

function escapeHtml(s) { return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toggleResolved(id) {
    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        const idx = dados.findIndex(d => String(d.id) === String(id));
        if (idx === -1) return alert('Denúncia não encontrada');
        dados[idx].resolved = !dados[idx].resolved;
        localStorage.setItem('denuncias', JSON.stringify(dados));
        gerarRelatorioWithControls(currentDias);
        showToast(dados[idx].resolved ? 'Marcado como resolvido.' : 'Marcado como não resolvido.', null, 'resolved-'+id, 2200);
    } catch (e) {
        console.error('Erro ao alternar resolved', e);
        alert('Erro ao atualizar status. Veja o console.');
    }
}

// Abrir modal de foto em Relatórios (sem tocar no mapa)
function openPhotoModalRel(id) {
    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        const d = dados.find(x => String(x.id) === String(id));
        if (!d) return alert('Denúncia não encontrada');
        const modal = document.getElementById('photo-modal-rel');
        if (!modal) return alert('Modal de foto não encontrado nesta página');
        document.getElementById('photo-modal-rel-img').src = d.thumb || '';
        document.getElementById('photo-modal-rel-bairro').innerText = d.bairro || '—';
        document.getElementById('photo-modal-rel-info').innerHTML = `<div><strong>Quem:</strong> ${escapeHtml(d.reporter||'—')}</div><div style="margin-top:6px"><strong>Horário:</strong> ${d.horario||'—'}</div>`;
        modal.style.display = 'flex';
        const markBtn = document.getElementById('photo-rel-mark-resolved');
        if (markBtn) markBtn.onclick = () => { toggleResolved(d.id); modal.style.display = 'none'; };
        const closeBtn = document.getElementById('photo-rel-close');
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    } catch (e) {
        console.error('Erro ao abrir modal de foto', e);
        alert('Erro ao abrir modal de foto. Veja console.');
    }
}

// Lazy-load helper for images using data-src
function initLazyLoad() {
    const lazyImages = Array.from(document.querySelectorAll('img.lazy'));
    if (!lazyImages.length) return;
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset && img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    img.classList.remove('lazy');
                    obs.unobserve(img);
                }
            });
        }, {rootMargin: '50px 0px', threshold: 0.01});
        lazyImages.forEach(img => io.observe(img));
    } else {
        // fallback: set src immediately
        lazyImages.forEach(img => { if (img.dataset && img.dataset.src) img.src = img.dataset.src; img.classList.remove('lazy'); });
    }
}