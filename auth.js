// Simple client-side auth: apenas um nome de usuário salvo no localStorage
const AUTH_KEY = 'ecolog_user';

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch(e){ return null; }
}

function setCurrentUser(user) {
    if (!user) { localStorage.removeItem(AUTH_KEY); renderUserArea(); return; }
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    renderUserArea();
    // notify other scripts
    document.dispatchEvent(new CustomEvent('ecolog-auth-changed', { detail: { user } }));
}

function logoutUser() {
    localStorage.removeItem(AUTH_KEY);
    renderUserArea();
    document.dispatchEvent(new CustomEvent('ecolog-auth-changed', { detail: { user: null } }));
}

function showLoginModal() {
    let modal = document.getElementById('login-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Entrar</h3>
                <div class="modal-body">
                    <label>Seu nome:<br><input id="login-name" class="input-estilizado" placeholder="Ex: Maria" /></label>
                </div>
                <div style="text-align:right; margin-top:8px;">
                    <button id="login-cancel">Cancelar</button>
                    <button id="login-submit" class="btn-denuncia">Entrar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('login-cancel').addEventListener('click', () => { modal.style.display = 'none'; });
        document.getElementById('login-submit').addEventListener('click', () => {
            const name = document.getElementById('login-name').value.trim();
            if (!name) return alert('Digite seu nome para entrar');
            setCurrentUser({ name: name });
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }
    modal.style.display = 'flex';
    const existing = getCurrentUser();
    if (existing) document.getElementById('login-name').value = existing.name || '';
}

function renderUserArea() {
    const area = document.getElementById('user-area');
    if (!area) return;
    const user = getCurrentUser();
    if (!user) {
        area.innerHTML = `<button id="btn-login" class="btn-denuncia" style="background:#3498db;">Entrar</button>`;
        document.getElementById('btn-login').addEventListener('click', showLoginModal);
    } else {
        area.innerHTML = `<div class="user-badge">👤 <strong>${escapeHtml(user.name)}</strong> <button id="btn-logout" style="margin-left:8px; background:transparent; border:none; color:white; cursor:pointer;">Sair</button></div>`;
        document.getElementById('btn-logout').addEventListener('click', () => { logoutUser(); });
    }
    // atualiza badge de relatórios pessoais (se existir o link)
    try {
        const rel = document.querySelector('a[href="relatorios.html"]');
        if (rel) {
            const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
            const myCount = user ? dados.filter(d => d.reporter === user.name).length : 0;
            let badge = rel.querySelector('.my-badge');
            if (!badge) {
                badge = document.createElement('span'); badge.className = 'my-badge'; badge.style.marginLeft = '8px'; badge.style.background = '#e67e22'; badge.style.padding = '2px 6px'; badge.style.borderRadius = '999px'; badge.style.color = 'white'; badge.style.fontSize = '0.85rem';
                rel.appendChild(badge);
            }
            badge.textContent = myCount > 0 ? myCount : '';
        }
    } catch(e) { /* ignore */ }
}

function escapeHtml(s) { return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// render initial
document.addEventListener('DOMContentLoaded', () => {
    // insert user area into header if header-inner exists
    const header = document.querySelector('.header-inner');
    if (header && !document.getElementById('user-area')) {
        const div = document.createElement('div');
        div.id = 'user-area';
        div.style.marginLeft = '12px';
        header.appendChild(div);
    }
    renderUserArea();
});
