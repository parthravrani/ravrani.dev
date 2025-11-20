// Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
            // Side navigation visibility & highlighting
            const sideNav = document.querySelector('.side-nav');
            const sideNavItems = document.querySelectorAll('.side-nav-item');
            const contentSections = ['overview', 'metrics', 'challenge', 'solution', 'impact', 'tech-stack', 'links']
                .map(id => document.getElementById(id))
                .filter(Boolean);

            if (sideNav && contentSections.length) {
                const toggleSideNavVisibility = () => {
                    if (window.scrollY > 200) {
                        sideNav.classList.add('visible');
                    } else {
                        sideNav.classList.remove('visible');
                    }
                };

                toggleSideNavVisibility();
                window.addEventListener('scroll', toggleSideNavVisibility);

                const sideNavObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const activeId = entry.target.id;
                            sideNavItems.forEach(item => {
                                item.classList.toggle('active', item.dataset.section === activeId);
                            });
                        }
                    });
                }, {
                    threshold: 0.35
                });

                contentSections.forEach(section => sideNavObserver.observe(section));
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
        });