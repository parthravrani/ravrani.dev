// Sub Navigation Scroll Detection and Highlighting
(function() {
    'use strict';

    const subnav = document.getElementById('subnav');
    if (!subnav) return;

    const links = subnav.querySelectorAll('.subnav-link');
    const sections = [];
    let isInitialLoad = true;

    // Build sections array from links
    links.forEach(link => {
        const sectionId = link.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
            sections.push({
                id: sectionId,
                element: section,
                link: link
            });
        }
    });

    if (sections.length === 0) return;
    
    // Prevent browser default hash scrolling
    if (window.location.hash) {
        // Remove hash temporarily to prevent auto-scroll
        const hash = window.location.hash;
        history.replaceState(null, null, ' ');
        // Restore hash after a short delay
        setTimeout(function() {
            history.replaceState(null, null, hash);
            isInitialLoad = false;
        }, 100);
    } else {
        isInitialLoad = false;
    }

    // Function to update active link
    function updateActiveLink() {
        const scrollPosition = window.scrollY;
        const offset = 200; // Offset for navbar + subnav + some padding

        let activeSection = null;
        let minDistance = Infinity;

        // Find the section closest to the top of viewport
        sections.forEach(section => {
            const rect = section.element.getBoundingClientRect();
            
            // Check if section is in viewport or just above it
            if (rect.top <= offset && rect.bottom >= 0) {
                const distance = Math.abs(rect.top - offset);
                if (distance < minDistance) {
                    minDistance = distance;
                    activeSection = section;
                }
            }
        });

        // If no section is in viewport, find the one we've scrolled past
        if (!activeSection) {
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const rect = section.element.getBoundingClientRect();
                const sectionTop = rect.top + scrollPosition;
                
                if (scrollPosition + offset >= sectionTop) {
                    activeSection = section;
                    break;
                }
            }
        }

        // Update active state
        sections.forEach(section => {
            if (section === activeSection) {
                section.link.classList.add('active');
            } else {
                section.link.classList.remove('active');
            }
        });
    }

    // Smooth scroll on click
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            
            if (section) {
                const offset = 160; // Offset for navbar (80px) + subnav (~80px)
                const elementPosition = section.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Update on scroll
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateActiveLink();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Initial update - delay to prevent auto-scroll on page load
    setTimeout(function() {
        updateActiveLink();
    }, 200);
})();

