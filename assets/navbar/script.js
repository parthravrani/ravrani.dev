/**
 * Navbar Script - Modern Interactive Navigation
 * Handles scroll effects, mobile menu, dropdowns, and smooth scrolling
 */

(function() {
    'use strict';

    // DOM Elements
    const navbar = document.getElementById('navbar');
    const navbarContainer = navbar?.querySelector('.navbar-container');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navbarLinks = document.querySelectorAll('.navbar-link, .navbar-mobile-link');
    const dropdowns = document.querySelectorAll('.navbar-dropdown');
    const mobileDropdowns = document.querySelectorAll('.navbar-mobile-dropdown');

    // State
    let lastScrollTop = 0;
    let isScrolling = false;

    /**
     * Initialize Navbar
     */
    function initNavbar() {
        if (!navbar) {
            console.warn('Navbar element not found');
            return;
        }

        // Handle scroll events
        handleScroll();
        window.addEventListener('scroll', throttle(handleScroll, 10), { passive: true });

        // Handle mobile menu - wait a bit to ensure DOM is ready
        setTimeout(() => {
            const toggle = document.getElementById('mobile-menu-toggle');
            const menu = document.getElementById('mobile-menu');
            
            if (!toggle) {
                console.error('Mobile menu toggle button not found!');
                return;
            }
            
            if (!menu) {
                console.error('Mobile menu element not found!');
                return;
            }
            
            console.log('Mobile menu elements found, attaching listeners');
            
            // Remove any existing listeners by cloning
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            // Attach listeners to new element
            newToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile menu toggle clicked');
                toggleMobileMenu(e);
            });
            
            newToggle.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile menu toggle touched');
                toggleMobileMenu(e);
            }, { passive: false });
        }, 100);

        // Handle dropdown menus
        initDropdowns();

        // Handle mobile dropdowns
        initMobileDropdowns();

        // Handle smooth scrolling for anchor links
        initSmoothScroll();

        // Handle active page highlighting
        highlightActivePage();

        // Close mobile menu when clicking outside
        document.addEventListener('click', handleOutsideClick);

        // Close mobile menu on window resize
        window.addEventListener('resize', handleResize);
    }

    /**
     * Handle Scroll Effects
     */
    function handleScroll() {
        if (!navbarContainer) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollThreshold = 50;

        // Add scrolled class when scrolling down
        if (scrollTop > scrollThreshold) {
            navbarContainer.classList.add('scrolled');
        } else {
            navbarContainer.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    }

    /**
     * Toggle Mobile Menu
     */
    function toggleMobileMenu(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-menu');
        
        if (!toggle || !menu) {
            console.error('Mobile menu elements not found in toggleMobileMenu');
            return;
        }

        const isActive = menu.classList.contains('active');
        console.log('Toggling mobile menu, current state:', isActive);
        
        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    /**
     * Open Mobile Menu
     */
    function openMobileMenu() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-menu');
        
        if (!toggle || !menu) {
            console.error('Mobile menu elements not found in openMobileMenu');
            return;
        }

        console.log('Opening mobile menu');
        menu.classList.add('active');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        
        // Force visibility with inline styles as backup
        menu.style.transform = 'translateX(0)';
        menu.style.display = 'block';
        menu.style.visibility = 'visible';
        menu.style.opacity = '1';
        menu.style.zIndex = '1002';
        
        console.log('Menu classes:', menu.className);
        console.log('Menu computed style:', window.getComputedStyle(menu).transform);
    }

    /**
     * Close Mobile Menu
     */
    function closeMobileMenu() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('mobile-menu');
        
        if (!toggle || !menu) {
            console.error('Mobile menu elements not found in closeMobileMenu');
            return;
        }

        console.log('Closing mobile menu');
        menu.classList.remove('active');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        // Reset inline styles
        menu.style.transform = 'translateX(-100%)';
        menu.style.display = '';
        menu.style.visibility = '';
        menu.style.opacity = '';
        menu.style.zIndex = '';

        // Close all mobile dropdowns
        const mobileDropdowns = document.querySelectorAll('.navbar-mobile-dropdown');
        mobileDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    /**
     * Initialize Dropdown Menus
     */
    function initDropdowns() {
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.navbar-dropdown-toggle');
            if (!toggle) return;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
                
                // Close all other dropdowns
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle current dropdown
                dropdown.setAttribute('aria-expanded', !isExpanded);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar-dropdown')) {
                dropdowns.forEach(dropdown => {
                    dropdown.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }

    /**
     * Initialize Mobile Dropdowns
     */
    function initMobileDropdowns() {
        mobileDropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.navbar-mobile-dropdown-toggle');
            if (!toggle) return;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
        });
    }

    /**
     * Initialize Smooth Scrolling
     */
    function initSmoothScroll() {
        navbarLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Check if it's an anchor link
            if (href && href.startsWith('#')) {
                link.addEventListener('click', (e) => {
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        e.preventDefault();
                        
                        // Close mobile menu if open
                        closeMobileMenu();
                        
                        // Calculate offset
                        const navbarHeight = navbarContainer?.offsetHeight || 80;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
                        
                        // Smooth scroll
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                });
            }
        });
    }

    /**
     * Highlight Active Page
     */
    function highlightActivePage() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').filter(Boolean).pop() || 'index.html';

        navbarLinks.forEach(link => {
            // Skip dropdown toggles and dropdown items - they're handled by Liquid template
            if (link.classList.contains('navbar-dropdown-toggle') || 
                link.classList.contains('navbar-mobile-dropdown-toggle') ||
                link.closest('.navbar-dropdown-menu') ||
                link.closest('.navbar-mobile-dropdown-menu')) {
                return; // Don't modify dropdown items, they're set by Liquid
            }

            const linkHref = link.getAttribute('href');
            const linkPage = link.getAttribute('data-page');

            // Remove active class
            link.classList.remove('active');

            // Check if link matches current page
            if (linkPage && document.body.getAttribute('data-page') === linkPage) {
                link.classList.add('active');
            } else if (linkHref && (
                (currentPage === 'index.html' && linkHref.includes('index.html')) ||
                (currentPage === 'portfolio' && linkHref.includes('portfolio')) ||
                (currentPage === 'blog' && linkHref.includes('blog'))
            )) {
                link.classList.add('active');
            }
        });

        // Handle Expertise dropdown toggle - check if we're on an expertise page
        const expertiseToggle = document.querySelector('.navbar-dropdown-toggle');
        const mobileExpertiseToggle = document.querySelector('.navbar-mobile-dropdown-toggle');
        const isExpertisePage = currentPath.includes('/expertise/');

        if (expertiseToggle && isExpertisePage) {
            expertiseToggle.classList.add('active');
        }
        if (mobileExpertiseToggle && isExpertisePage) {
            mobileExpertiseToggle.classList.add('active');
        }
    }

    /**
     * Handle Outside Click
     */
    function handleOutsideClick(e) {
        // Close mobile menu if clicking outside
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        }
    }

    /**
     * Handle Window Resize
     */
    function handleResize() {
        // Close mobile menu on desktop
        if (window.innerWidth >= 768 && mobileMenu?.classList.contains('active')) {
            closeMobileMenu();
        }
    }

    /**
     * Throttle Function
     */
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Debounce Function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavbar);
    } else {
        initNavbar();
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            highlightActivePage();
        }
    });

})();
