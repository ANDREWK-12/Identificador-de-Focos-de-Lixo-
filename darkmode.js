
(function(){
    function applyDark(isDark){
        if(isDark) document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        // atualiza o estado do botão (se tiver mais de um, atualiza todos)
        document.querySelectorAll('#dark-toggle').forEach(btn => {
            btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            btn.textContent = isDark ? '☀️' : '🌙';
        });
    }

    function init(){
        const btns = document.querySelectorAll('#dark-toggle');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark');
                window.localStorage.setItem('darkMode', isDark ? 'true' : 'false');
                applyDark(isDark);
            });
        });

        
        const stored = window.localStorage.getItem('darkMode');
        if(stored === 'true') applyDark(true);
        else if(stored === 'false') applyDark(false);
        else {
            
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyDark(prefersDark);
        }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
