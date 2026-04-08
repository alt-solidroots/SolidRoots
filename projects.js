/* ================================
   PROJECTS PAGE — Scripts
   ================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Cursor ----
    const cur = document.getElementById('cur');
    const curO = document.getElementById('curO');
    let mx = 0, my = 0, ox = 0, oy = 0;

    if (cur && curO) {
        document.addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
            cur.style.left = mx + 'px';
            cur.style.top = my + 'px';
        });
        (function loop() {
            ox += (mx - ox) * 0.12;
            oy += (my - oy) * 0.12;
            curO.style.left = ox + 'px';
            curO.style.top = oy + 'px';
            requestAnimationFrame(loop);
        })();

        const hovers = 'a,button,.btn,.project-card,.footer-social,.back-to-top,.role,.mob-link,.header-link,.mob-toggle';
        document.querySelectorAll(hovers).forEach(el => {
            el.addEventListener('mouseenter', () => curO.classList.add('hover'));
            el.addEventListener('mouseleave', () => curO.classList.remove('hover'));
        });
    }

    // ---- Scrollbar ----
    const sThumb = document.getElementById('sThumb');
    function updateBar() {
        if (!sThumb) return;
        const s = window.scrollY;
        const d = document.documentElement.scrollHeight - window.innerHeight;
        const p = d > 0 ? s / d : 0;
        const h = Math.max(20, (window.innerHeight / document.documentElement.scrollHeight) * window.innerHeight);
        sThumb.style.height = h + 'px';
        sThumb.style.transform = `translateY(${p * (window.innerHeight - h)}px)`;
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();

    // ---- Smooth Scroll ----
    let cs = window.scrollY, ts = window.scrollY, scrolling = false;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouch) {
        window.addEventListener('wheel', e => {
            e.preventDefault();
            ts += e.deltaY;
            ts = Math.max(0, Math.min(ts, document.documentElement.scrollHeight - window.innerHeight));
            if (!scrolling) { scrolling = true; sLoop(); }
        }, { passive: false });
    }

    function sLoop() {
        cs += (ts - cs) * 0.1;
        if (Math.abs(ts - cs) < 0.5) { cs = ts; scrolling = false; }
        window.scrollTo(0, cs);
        if (scrolling) requestAnimationFrame(sLoop);
    }

    window.addEventListener('scroll', () => {
        if (!scrolling) { cs = window.scrollY; ts = window.scrollY; }
    }, { passive: true });

    function smoothTo(y) {
        ts = y;
        if (!scrolling) { scrolling = true; sLoop(); }
    }

    // Back to top
    document.getElementById('backToTop')?.addEventListener('click', () => smoothTo(0));

    // Mobile menu
    const mobToggle = document.getElementById('mobToggle');
    const mobMenu = document.getElementById('mobMenu');
    if (mobToggle && mobMenu) {
        mobToggle.addEventListener('click', () => {
            mobToggle.classList.toggle('active');
            mobMenu.classList.toggle('active');
        });
    }

    // ---- Scroll Reveal ----
    const scrollEls = document.querySelectorAll('.anim-up-s');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('show');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    scrollEls.forEach(el => observer.observe(el));

    // Fade-in elements
    document.querySelectorAll('.anim-fade[data-delay]').forEach(el => {
        const d = parseInt(el.dataset.delay || 0);
        setTimeout(() => el.classList.add('show'), d * 100 + 200);
    });

    // ---- Text Scramble ----
    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    function scramble(el) {
        const orig = el.getAttribute('data-text');
        if (!orig) return;
        let i = 0;
        const iv = setInterval(() => {
            el.textContent = orig.split('').map((c, idx) =>
                idx < i ? orig[idx] : scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
            ).join('');
            i += 0.6;
            if (i >= orig.length) { el.textContent = orig; clearInterval(iv); }
        }, 25);
    }

    document.querySelectorAll('[data-text]').forEach(el => {
        el.addEventListener('mouseenter', () => scramble(el));
    });

    // ---- Logo scramble ----
    const logo = document.getElementById('headerLogo');
    if (logo) {
        logo.addEventListener('mouseenter', () => {
            const orig = 'Aayush';
            let i = 0;
            const iv = setInterval(() => {
                logo.textContent = orig.split('').map(c =>
                    Math.random() > 0.5 ? scrambleChars[Math.floor(Math.random() * scrambleChars.length)] : c
                ).join('');
                if (++i > 5) { logo.textContent = orig; clearInterval(iv); }
            }, 50);
        });
    }

});
