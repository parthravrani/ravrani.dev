// Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
            // Scroll Reveal Animation - Only for specific elements that need it
            // Reduced threshold and only observe elements that actually need animation
            const scrollRevealElements = document.querySelectorAll('.scroll-reveal');
            if (scrollRevealElements.length > 0) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            // Unobserve after animation to prevent re-triggering
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: '0px 0px -50px 0px'
                });

                scrollRevealElements.forEach(el => {
                    observer.observe(el);
                });
            }
        });