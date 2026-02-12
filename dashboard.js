// Configuração inicial focada na região de Belém e Ananindeua
const map = L.map('mapa-residuos').setView([-1.4090, -48.4350], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

function renderizarMapa() {
    const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
    // mostra apenas não resolvidos no painel principal
    const naoResolvidos = dados.filter(d => !d.resolved);
    document.getElementById('txt-total').innerText = naoResolvidos.length;

    naoResolvidos.forEach(denuncia => {
        L.marker([denuncia.lat, denuncia.lon]).addTo(map)
            .bindPopup(`
                <b>Foco de Lixo Detectado</b><br>
                <b>Horário:</b> ${denuncia.horario}<br>
                <b>IA Confiança:</b> ${denuncia.confianca}%<br>
                <b>Quem:</b> ${denuncia.reporter || '—'}
            `);
    });

    // preenche grid de miniaturas apenas com não resolvidos
    const grid = document.getElementById('grid-fotos');
    if (grid) {
        grid.innerHTML = '';
        naoResolvidos.forEach(d => {
            const card = document.createElement('div');
            card.className = 'feed-card';
            card.id = `feed-${d.id}`;
            const img = document.createElement('img');
            img.src = d.thumb || '';
            img.className = 'feed-img';
            img.alt = d.bairro || 'Foto';
            img.title = `${d.bairro || ''} — ${d.horario}`;
            // abrir/expandir inline ao clicar
            img.addEventListener('click', () => { toggleExpandCard(d.id); });

            const meta = document.createElement('div');
            meta.className = 'feed-meta';
            const left = document.createElement('div'); left.className = 'left';
            const userBadge = document.createElement('div'); userBadge.className = 'user-badge-small'; userBadge.textContent = d.reporter || '—';
            const caption = document.createElement('div'); caption.className = 'feed-caption'; caption.innerText = d.bairro || '—';
            left.appendChild(userBadge); left.appendChild(caption);

            const actions = document.createElement('div'); actions.className = 'feed-actions';
            const btnView = document.createElement('button'); btnView.className = 'btn-view'; btnView.textContent = 'Ver'; btnView.addEventListener('click', () => { window.location.href = `index.html#feed-${d.id}`; });
            const btnResolve = document.createElement('button'); btnResolve.className = 'btn-resolve'; btnResolve.textContent = d.resolved ? 'Resolvido' : 'Marcar Resolvido'; btnResolve.addEventListener('click', () => { toggleResolvedInDash(d.id); });
            actions.appendChild(btnView); actions.appendChild(btnResolve);

            meta.appendChild(left); meta.appendChild(actions);
            card.appendChild(img); card.appendChild(meta);
            grid.appendChild(card);
        });
    }
}

// Toggle expand a card inline (mostra imagem maior e detalhes dentro do card)
function toggleExpandCard(id) {
    const card = document.getElementById(`feed-${id}`);
    if (!card) return;
    const expanded = card.classList.toggle('expanded');
    const img = card.querySelector('.feed-img');
            if (expanded) {
        img.style.height = '60vh';
        // append details area if not exists
        if (!card.querySelector('.expanded-area')) {
            const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
            const d = dados.find(x => String(x.id) === String(id));
            const area = document.createElement('div');
            area.className = 'expanded-area';
            area.style.padding = '12px';
            area.style.background = 'white';
            area.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; gap:12px"><div><strong>${d.bairro||''}</strong><div style="font-size:0.85rem; color:rgba(10,51,35,0.7)">Por: ${escapeHtml(d.reporter||'—')} • ${d.horario||''}</div></div><div><button class="btn-resolve">Marcar/Desmarcar</button></div></div>`;
            card.appendChild(area);
            const btn = area.querySelector('.btn-resolve');
            btn.addEventListener('click', () => { toggleResolvedInDash(d.id); card.classList.remove('expanded'); img.style.height = '340px'; area.remove(); });
        }
        // scroll to card
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        img.style.height = '340px';
        const area = card.querySelector('.expanded-area');
        if (area) area.remove();
    }
}

// Expand card if hash references it
document.addEventListener('DOMContentLoaded', () => {
    if (location.hash && location.hash.startsWith('#feed-')) {
        const id = location.hash.replace('#feed-', '');
        // slight delay to ensure feed rendered
        setTimeout(() => { toggleExpandCard(id); }, 200);
    }
});

// helper: escape HTML to avoid injection when rendering user-supplied names
function escapeHtml(s) { return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// toggle resolved flag locally and re-render dashboard
function toggleResolvedInDash(id) {
    try {
        const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        const idx = dados.findIndex(d => String(d.id) === String(id));
        if (idx === -1) { alert('Denúncia não encontrada'); return; }
        dados[idx].resolved = !dados[idx].resolved;
        localStorage.setItem('denuncias', JSON.stringify(dados));
        renderizarMapa();
    } catch (e) {
        console.error('Erro ao alternar resolved (dashboard)', e);
        alert('Erro ao atualizar status. Veja console.');
    }
}

renderizarMapa();
// re-render quando usuário loga/logaout
document.addEventListener('ecolog-auth-changed', () => { renderizarMapa(); });