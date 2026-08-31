// Scroll reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

// Reveal above-the-fold sections immediately
document.querySelectorAll('.hero, .page-intro, .page-main > .section:first-child').forEach(el => {
    el.classList.add('visible');
});

// Progress bar
document.addEventListener('DOMContentLoaded', function() {
    // Cursor-following spotlight on project cards (single active card, gap-safe)
    let activeCard = null;
    let clearTimer = null;

    function setSpotlight(card, e) {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        card.style.setProperty('--mouse-x', `${x}%`);
        card.style.setProperty('--mouse-y', `${y}%`);
    }

    function activateCard(card, e) {
        if (card === activeCard) {
            setSpotlight(card, e);
            return;
        }
        if (activeCard) {
            activeCard.classList.remove('is-spotlight');
        }
        activeCard = card;
        setSpotlight(card, e);
        card.classList.add('is-spotlight');
    }

    function deactivateCard() {
        if (!activeCard) return;
        activeCard.classList.remove('is-spotlight');
        activeCard = null;
    }

    document.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.project-card, .portfolio-card');
        clearTimeout(clearTimer);

        if (card) {
            activateCard(card, e);
        } else if (activeCard) {
            // Brief delay so crossing 1px grid gaps doesn't flash off/on
            clearTimer = setTimeout(deactivateCard, 50);
        }
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
        clearTimeout(clearTimer);
        deactivateCard();
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed; top: 0; left: 0; width: 0%; height: 2px;
            background: #E07A2F; z-index: 10000; transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);

        ScrollTrigger.create({
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: self => { progressBar.style.width = `${self.progress * 100}%`; }
        });
    }
});
