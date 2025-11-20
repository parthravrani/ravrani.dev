// Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
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