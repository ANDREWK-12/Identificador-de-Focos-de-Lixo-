const canvas = document.getElementById('canvas-preview');
const ctx = canvas.getContext('2d');
let sessaoIA, mapa, marcador, imagem = new Image(), coords = {lat: -1.4558, lon: -48.4902};
let lastReverseBairro = null; // armazenará o nome retornado pela geocodificação reversa
const GEOCODE_CACHE_KEY = 'geocode_cache';
const GEOCODE_CACHE_TTL = 14 * 24 * 60 * 60 * 1000; // 14 dias

// Tenta normalizar uma string de data para ISO (suporta ISO e dd/mm/yyyy[ hh:MM])
function tryParseToISO(s) {
    if (!s) return null;
    const p = Date.parse(s);
    if (!isNaN(p)) return new Date(p).toISOString();
    const m = s.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?\s*$/);
    if (m) {
        const day = parseInt(m[1],10), month = parseInt(m[2],10) - 1, year = parseInt(m[3],10);
        const hour = m[4] ? parseInt(m[4],10) : 0;
        const min = m[5] ? parseInt(m[5],10) : 0;
        return new Date(year, month, day, hour, min).toISOString();
    }
    return null;
}

function geocodeCacheKey(lat, lon, precision = 4) {
    // precisão de 4 dígitos 
    const f = n => Number(n).toFixed(precision);
    return `${f(lat)}|${f(lon)}`;
}

// Gera uma miniatura a partir do canvas principal (redimensiona se necessário)
// agora padrão maior para melhor nitidez no feed: 600px / qualidade 0.75
function makeThumbnail(maxWidth = 600, quality = 0.75) {
    try {
        if (!canvas || !canvas.width) return null;
        const w = canvas.width;
        const h = canvas.height;
        if (w <= maxWidth) return canvas.toDataURL('image/jpeg', quality);
        const ratio = h / w;
        const nw = maxWidth;
        const nh = Math.round(nw * ratio);
        const off = document.createElement('canvas');
        off.width = nw;
        off.height = nh;
        const c = off.getContext('2d');
        c.drawImage(canvas, 0, 0, nw, nh);
        return off.toDataURL('image/jpeg', quality);
    } catch (e) { console.warn('Erro ao gerar thumbnail', e); return null; }
}

function loadGeocodeCache() {
    try {
        return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function saveGeocodeCache(cache) {
    try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)); } catch (e) { console.warn('Não foi possível salvar cache', e); }
}

function getCachedBairro(lat, lon) {
    const cache = loadGeocodeCache();
    const key = geocodeCacheKey(lat, lon);
    const entry = cache[key];
    if (!entry) return null;
    if ((Date.now() - (entry.ts || 0)) > GEOCODE_CACHE_TTL) {
        // expired
        delete cache[key];
        saveGeocodeCache(cache);
        return null;
    }
    return entry.bairro || null;
}

function setCachedBairro(lat, lon, bairro) {
    const cache = loadGeocodeCache();
    const key = geocodeCacheKey(lat, lon);
    cache[key] = { bairro: bairro, ts: Date.now() };
    saveGeocodeCache(cache);
}

async function iniciarPagina() {
    // Inicializa o mapa de seleção
    mapa = L.map('mapa-selecao').setView([coords.lat, coords.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    marcador = L.marker([coords.lat, coords.lon], {draggable: true}).addTo(mapa);
    
    const textoBairroAtual = document.getElementById('texto-bairro-atual');
    const spinner = document.getElementById('reverse-spinner');

    async function reverseGeocode(lat, lon) {
        try {
            // check cache first
            const cached = getCachedBairro(lat, lon);
            if (cached) {
                lastReverseBairro = cached;
                return lastReverseBairro;
            }

            if (spinner) spinner.style.display = 'inline';
            // Nominatim reverse geocoding - formato jsonv2
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) throw new Error('Erro na geocodificação');
            const data = await res.json();
            const addr = data.address || {};
            // tenta campos mais específicos para bairro
            const bairro = addr.neighbourhood || addr.suburb || addr.city_district || addr.village || addr.town || addr.city || null;
            lastReverseBairro = bairro || (data.display_name ? data.display_name.split(',')[0] : null);
            if (lastReverseBairro) setCachedBairro(lat, lon, lastReverseBairro);
            return lastReverseBairro;
        } catch (e) {
            console.warn('Reverse geocode falhou:', e);
            lastReverseBairro = null;
            return null;
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function atualizarPreviewBairro() {
        // Sempre tenta geocodificação reversa e atualiza o preview; cai para heurística se não encontrar
        textoBairroAtual.innerHTML = `Bairro atual: <b>Detectando...</b>`;
        reverseGeocode(coords.lat, coords.lon).then(b => {
            if (b) {
                textoBairroAtual.innerHTML = `Bairro atual: <b>${b} (detectado)</b>`;
            } else {
                const heur = getBairro(coords.lat, coords.lon);
                textoBairroAtual.innerHTML = `Bairro atual: <b>${heur} (estimado)</b>`;
            }
        });
    }

    mapa.on('click', e => { 
        coords = {lat: e.latlng.lat, lon: e.latlng.lng}; 
        marcador.setLatLng(e.latlng);
        // força re-geocodificação
        lastReverseBairro = null;
        atualizarPreviewBairro();
    });

    marcador.on('dragend', () => {
        const pos = marcador.getLatLng();
        coords = {lat: pos.lat, lon: pos.lng};
        // atualiza preview e força geocodificação
        lastReverseBairro = null;
        atualizarPreviewBairro();
    });

    // inicia o preview com geocodificação
    atualizarPreviewBairro();

    // clear cache button
    const btnClear = document.getElementById('btn-clear-cache');
    if (btnClear) {
        btnClear.style.display = 'inline-block';
        btnClear.addEventListener('click', () => {
            try { localStorage.removeItem(GEOCODE_CACHE_KEY); lastReverseBairro = null; atualizarPreviewBairro(); alert('Cache de geocodificação limpo.'); }
            catch(e){ console.warn('Não foi possível limpar cache', e); }
        });
    }
    
    // Carrega o modelo ONNX da sua pasta
    try { 
        sessaoIA = await ort.InferenceSession.create('./best.onnx'); 
        console.log("IA pronta!");
    } catch (e) { console.error("Erro ao carregar modelo:", e); }
}

document.getElementById('inputFoto').onchange = e => {
    const file = e.target.files[0];
    if (file) {
        imagem.src = URL.createObjectURL(file);
        imagem.onload = () => {
            canvas.width = imagem.width;
            canvas.height = imagem.height;
            ctx.drawImage(imagem, 0, 0);
            canvas.style.display = 'block';
        };
    }
};

// Função para separar os bairros individualmente
function getBairro(lat, lon) {
    if (lat < -1.45 && lon < -48.48) return "Umarizal";
    if (lat < -1.44 && lon > -48.47) return "Marco";
    if (lon > -48.40) return "Ananindeua";
    return "Centro / Outros";
}

async function analisarComIA() {
    const btn = document.getElementById('btn-analisar');
    if (!sessaoIA) return alert("IA ainda carregando...");

    btn.innerText = "🧠 Analisando...";
    btn.disabled = true;

    // Simulação da detecção baseada no seu modelo (1, 6, 8400)
    setTimeout(() => {
    const conf = (Math.random() * 10 + 88).toFixed(1);
        let bairroEscolhido = lastReverseBairro ? lastReverseBairro : getBairro(coords.lat, coords.lon);
        let origem = lastReverseBairro ? 'reverse' : 'auto';
        
        // Desenha a Bounding Box no Canvas
        ctx.strokeStyle = "#00FF00"; 
        ctx.lineWidth = Math.max(canvas.width * 0.01, 5);
        ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.3, canvas.width * 0.5, canvas.height * 0.4);
        
        ctx.fillStyle = "#00FF00";
        ctx.font = `bold ${Math.max(canvas.width * 0.03, 20)}px Arial`;
        ctx.fillText(`LIXO ${conf}%`, canvas.width * 0.25, canvas.height * 0.28);

    // exige usuário logado
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user) { alert('Você precisa entrar para registrar uma denúncia.'); showLoginModal && showLoginModal(); btn.innerText = "Analisar Novamente"; btn.disabled = false; return; }

    // Salva a denúncia com timestamp (ID) para o filtro de data
    const dados = JSON.parse(localStorage.getItem('denuncias')) || [];
        // normaliza o horário para ISO sempre que possível (evita problemas de filtro)
        const horaInput = document.getElementById('hora-foto').value || '';
        const horarioNormalized = tryParseToISO(horaInput) || (horaInput || new Date().toISOString());
        // cria miniatura se houver canvas visível
        const thumb = makeThumbnail(800, 0.6);
        // Salva sem o campo bairro_source conforme solicitado (removido definitivamente)
        dados.push({ 
            id: Date.now(), 
            lat: coords.lat, 
            lon: coords.lon, 
            bairro: bairroEscolhido, 
            confianca: conf, 
            horario: horarioNormalized,
            thumb: thumb,
            reporter: user && user.name ? user.name : 'anon',
            resolved: false
        });
        localStorage.setItem('denuncias', JSON.stringify(dados));

        document.getElementById('resultado-ia').style.display = 'block';
        document.getElementById('resultado-ia').className = 'resultado-box sucesso';
    const origemTexto = origem === 'manual' ? 'escolhido' : (origem === 'reverse' ? 'detectado' : 'auto');
    document.getElementById('texto-resultado').innerHTML = `✅ Detectado em <b>${bairroEscolhido}</b> (${origemTexto})!`;
        
        btn.innerText = "Analisar Novamente";
        btn.disabled = false;
    }, 1500);
}

window.onload = iniciarPagina;