// Navigation (Desktop + Mobile)
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const navScrollLinks = document.querySelectorAll('.nav-link[data-scroll-target]');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    });
});

// Mobile Dropdown Toggle
const mobileDropdown = document.querySelector('.mobile-dropdown');
const mobileDropdownToggle = document.querySelector('.mobile-dropdown-toggle');
const mobileDropdownMenu = document.querySelector('.mobile-dropdown-menu');

if (mobileDropdown && mobileDropdownToggle && mobileDropdownMenu) {
    mobileDropdownToggle.addEventListener('click', (e) => {
        e.preventDefault();
        mobileDropdown.classList.toggle('active');
        mobileDropdownMenu.classList.toggle('hidden');
    });
}

// Desktop Dropdown Menu
const expertiseDropdown = document.querySelector('.nav-dropdown');
const expertiseToggle = document.querySelector('.nav-dropdown-toggle');
const navDropdownMenu = document.querySelector('.nav-dropdown-menu');
const mainNav = document.getElementById('main-nav');
let navDropdownBackdrop = null;

if (expertiseDropdown && expertiseToggle && navDropdownMenu) {
    navDropdownBackdrop = document.createElement('div');
    navDropdownBackdrop.className = 'nav-dropdown-backdrop';
    document.body.appendChild(navDropdownBackdrop);
    
    let hoverTimeout;
    
    const updateDropdownPosition = () => {
        if (mainNav) {
            const navRect = mainNav.getBoundingClientRect();
            navDropdownMenu.style.top = `${navRect.bottom}px`;
            navDropdownMenu.style.marginTop = '0';
        }
    };
    
    const showDropdown = () => {
        clearTimeout(hoverTimeout);
        expertiseDropdown.classList.add('active');
        expertiseToggle.setAttribute('aria-expanded', 'true');
        navDropdownBackdrop.style.opacity = '1';
        navDropdownBackdrop.style.visibility = 'visible';
        updateDropdownPosition();
        window.addEventListener('scroll', updateDropdownPosition);
        window.addEventListener('resize', updateDropdownPosition);
    };
    
    const hideDropdown = () => {
        hoverTimeout = setTimeout(() => {
            expertiseDropdown.classList.remove('active');
            expertiseToggle.setAttribute('aria-expanded', 'false');
            navDropdownBackdrop.style.opacity = '0';
            navDropdownBackdrop.style.visibility = 'hidden';
            window.removeEventListener('scroll', updateDropdownPosition);
            window.removeEventListener('resize', updateDropdownPosition);
        }, 200);
    };
    
    expertiseDropdown.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        showDropdown();
    });
    
    expertiseDropdown.addEventListener('mouseleave', () => {
        hideDropdown();
    });
    
    navDropdownMenu.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        showDropdown();
    });
    
    navDropdownMenu.addEventListener('mouseleave', () => {
        hideDropdown();
    });
    
    expertiseToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (expertiseDropdown.classList.contains('active')) {
            hideDropdown();
        } else {
            showDropdown();
        }
    });
    
    navDropdownBackdrop.addEventListener('click', () => {
        expertiseDropdown.classList.remove('active');
        expertiseToggle.setAttribute('aria-expanded', 'false');
        navDropdownBackdrop.style.opacity = '0';
        navDropdownBackdrop.style.visibility = 'hidden';
    });
    
    window.addEventListener('scroll', () => {
        if (expertiseDropdown.classList.contains('active')) {
            updateDropdownPosition();
        }
    });
}

// Scroll Reveal Animation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.1
});

document.querySelectorAll('.scroll-reveal').forEach(el => {
    observer.observe(el);
});

