// Simple Scroll Reveal
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

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Simple Scroll Progress Indicator
        
        document.addEventListener('DOMContentLoaded', function() {
            gsap.registerPlugin(ScrollTrigger); 
            
            // ===== FLOATING TECH ICONS WITH PARALLAX =====
            const floatingIconsContainer = document.getElementById('floating-tech-icons');
            const heroSectionEl = document.getElementById('hero');
            const aboutSectionEl = document.getElementById('about');
            
            if (floatingIconsContainer && heroSectionEl) {
                // Set container height to ONLY cover hero section (not about section)
                const updateContainerHeight = () => {
                    const heroHeight = heroSectionEl.offsetHeight;
                    floatingIconsContainer.style.height = `${heroHeight}px`;
                };
                
                // Initial height set
                setTimeout(updateContainerHeight, 100);
                
                // Update on resize
                window.addEventListener('resize', updateContainerHeight);
                // Tech icons matching your tech toolbox - using actual technologies you know
                const allTechIcons = [
                    { icon: 'fa-brands fa-microsoft', color: '#512BD4', name: '.NET', type: 'fontawesome' },
                    { icon: 'https://cdn.simpleicons.org/postgresql/4169E1', color: '#4169E1', name: 'PostgreSQL', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/mysql/4479A1', color: '#4479A1', name: 'MySQL', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/mongodb/47A248', color: '#47A248', name: 'MongoDB', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/redis/DC382D', color: '#DC382D', name: 'Redis', type: 'image' },
                    { icon: 'fa-brands fa-aws', color: '#FF9900', name: 'AWS', type: 'fontawesome' },
                    { icon: 'fa-brands fa-microsoft', color: '#0078D4', name: 'Azure', type: 'fontawesome' },
                    { icon: 'fa-brands fa-docker', color: '#2496ED', name: 'Docker', type: 'fontawesome' },
                    { icon: 'https://cdn.simpleicons.org/kubernetes/326CE5', color: '#326CE5', name: 'Kubernetes', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/terraform/7B42BC', color: '#7B42BC', name: 'Terraform', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/githubactions/2088FF', color: '#2088FF', name: 'GitHub Actions', type: 'image' },
                    { icon: 'https://cdn.simpleicons.org/graphql/E10098', color: '#E10098', name: 'GraphQL', type: 'image' }
                ];
                
                // Randomly select icons from the full list
                const shuffledAll = allTechIcons.sort(() => Math.random() - 0.5);
                const techIcons = shuffledAll.slice(0, 8); // Reduced to 8 icons
                
                // Shuffle the selected icons for random positioning
                const shuffledIcons = techIcons.sort(() => Math.random() - 0.5);
                
                console.log(`Creating ${shuffledIcons.length} floating tech icons`);
                
                // Store all icon elements for splash effect
                const iconElements = [];
                
                shuffledIcons.forEach((tech, index) => {
                    const iconElement = document.createElement('div');
                    iconElement.className = 'floating-tech-icon';
                    iconElement.setAttribute('data-tech', tech.name);
                    
                    // Better positioning - distribute evenly across all areas
                    let left, top;
                    const positionType = Math.random();
                    
                    // Distribute icons more evenly - 40% left, 40% right, 10% top corners, 10% bottom corners
                    if (positionType < 0.4) {
                        // Left side (0-30% from left) - more spread out
                        left = 2 + Math.random() * 28;
                        top = 15 + Math.random() * 70;
                    } else if (positionType < 0.8) {
                        // Right side (70-98% from left) - more spread out
                        left = 70 + Math.random() * 28;
                        top = 15 + Math.random() * 70;
                    } else if (positionType < 0.9) {
                        // Top corners
                        if (Math.random() < 0.5) {
                            left = 3 + Math.random() * 20; // Top left
                        } else {
                            left = 77 + Math.random() * 20; // Top right
                        }
                        top = 5 + Math.random() * 20;
                    } else {
                        // Bottom corners
                        if (Math.random() < 0.5) {
                            left = 3 + Math.random() * 20; // Bottom left
                        } else {
                            left = 77 + Math.random() * 20; // Bottom right
                        }
                        top = 75 + Math.random() * 20;
                    }
                    
                    // Create icon based on type
                    if (tech.type === 'image') {
                        const iconImg = document.createElement('img');
                        iconImg.src = tech.icon;
                        iconImg.alt = tech.name;
                        iconImg.style.width = '28px';
                        iconImg.style.height = '28px';
                        iconImg.style.objectFit = 'contain';
                        iconElement.appendChild(iconImg);
                    } else {
                        const icon = document.createElement('i');
                        icon.className = tech.icon;
                        icon.style.color = tech.color;
                        iconElement.appendChild(icon);
                    }
                    
                    iconElements.push(iconElement);
                    
                    // Store initial position for calculations
                    iconElement._initialLeft = left;
                    iconElement._initialTop = top;
                    
                    // Store floating animation values - random directions and speeds for each icon
                    // Random direction angle (0 to 360 degrees)
                    const directionAngle = Math.random() * 360;
                    // Random movement distance
                    const movementDistance = 15 + Math.random() * 25; // 15-40px
                    // Calculate X and Y based on direction
                    const floatX = Math.cos(directionAngle * Math.PI / 180) * movementDistance;
                    const floatY = Math.sin(directionAngle * Math.PI / 180) * movementDistance;
                    // Random rotation direction and speed
                    const rotationDirection = Math.random() < 0.5 ? 1 : -1; // Random clockwise or counterclockwise
                    const floatRotate = rotationDirection * (5 + Math.random() * 15); // 5-20 degrees
                    const floatDuration = 2 + Math.random() * 3; // 2-5 seconds - different speeds for each
                    
                    // Parallax values
                    const parallaxY = 100 + (Math.random() * 100); // 100 to 200px movement
                    const parallaxX = (Math.random() * 80 - 40); // -40 to +40px
                    const parallaxRotate = (Math.random() * 360 - 180); // -180 to +180 degrees
                    const scrubSpeed = 0.5 + Math.random() * 1.5; // 0.5 to 2 for smoother parallax
                    
                    // Move icon to container first, then wrap it
                    const parallaxWrapper = document.createElement('div');
                    parallaxWrapper.style.position = 'absolute';
                    parallaxWrapper.style.left = `${left}%`;
                    parallaxWrapper.style.top = `${top}%`;
                    parallaxWrapper.style.width = '55px';
                    parallaxWrapper.style.height = '55px';
                    iconElement.style.position = 'absolute';
                    iconElement.style.left = '0';
                    iconElement.style.top = '0';
                    parallaxWrapper.appendChild(iconElement);
                    floatingIconsContainer.appendChild(parallaxWrapper);
                    
                    // Debug: log icon creation
                    console.log(`Created icon: ${tech.name} at ${left}%, ${top}%`);
                    
                    // Continuous smooth floating animation - random direction for each icon
                    gsap.to(iconElement, {
                        x: floatX,
                        y: floatY,
                        duration: floatDuration,
                        ease: "sine.inOut", // Smooth floating motion
                        repeat: -1,
                        yoyo: true,
                        delay: Math.random() * 2 // Random start delay
                    });
                    
                    // Independent continuous rotation - random speed and direction for each icon
                    const rotationSpeed = 15 + Math.random() * 25; // 15-40 seconds for full rotation (random speed)
                    const rotationDir = Math.random() < 0.5 ? 360 : -360; // Random clockwise or counterclockwise
                    gsap.to(iconElement, {
                        rotation: `+=${rotationDir}`,
                        duration: rotationSpeed,
                        ease: "none", // Constant rotation speed
                        repeat: -1
                    });
                    
                    // Parallax on scroll - extends from hero to about section
                    gsap.to(parallaxWrapper, {
                        y: parallaxY,
                        x: parallaxX,
                        rotation: parallaxRotate,
                        ease: "none",
                        scrollTrigger: {
                            trigger: '#hero',
                            start: 'top top',
                            end: 'bottom top',
                            scrub: scrubSpeed,
                            invalidateOnRefresh: true
                        }
                    });
                });
                
                // Click splash effect - ONLY in hero section
                if (heroSectionEl) {
                    heroSectionEl.addEventListener('click', (e) => {
                        // Don't trigger on buttons or links
                        if (e.target.closest('a, button')) return;
                        
                        const clickX = e.clientX;
                        const clickY = e.clientY;
                        
                        // Create splash effect
                        const splash = document.createElement('div');
                        splash.className = 'splash-effect';
                        splash.style.left = `${clickX}px`;
                        splash.style.top = `${clickY}px`;
                        floatingIconsContainer.appendChild(splash);
                        
                        // Remove splash after animation
                        setTimeout(() => splash.remove(), 600);
                        
                        // Push nearby icons away
                        iconElements.forEach(icon => {
                            const iconRect = icon.getBoundingClientRect();
                            const iconCenterX = iconRect.left + iconRect.width / 2;
                            const iconCenterY = iconRect.top + iconRect.height / 2;
                            
                            const distance = Math.sqrt(
                                Math.pow(clickX - iconCenterX, 2) + 
                                Math.pow(clickY - iconCenterY, 2)
                            );
                            
                            // Only affect icons within 250px
                            if (distance < 250 && distance > 0) {
                                const angle = Math.atan2(iconCenterY - clickY, iconCenterX - clickX);
                                const pushDistance = (250 - distance) / 3; // Stronger push for closer icons
                                const pushX = Math.cos(angle) * pushDistance;
                                const pushY = Math.sin(angle) * pushDistance;
                                
                                // Find the wrapper for this icon
                                const wrapper = icon.parentElement;
                                
                                // Get current GSAP values
                                const currentIconX = gsap.getProperty(icon, "x") || 0;
                                const currentIconY = gsap.getProperty(icon, "y") || 0;
                                const currentWrapperX = gsap.getProperty(wrapper, "x") || 0;
                                const currentWrapperY = gsap.getProperty(wrapper, "y") || 0;
                                
                                // Kill any existing animations
                                gsap.killTweensOf(icon);
                                gsap.killTweensOf(wrapper);
                                
                                // Push wrapper away with bounce effect
                                gsap.to(wrapper, {
                                    x: currentWrapperX + pushX,
                                    y: currentWrapperY + pushY,
                                    rotation: (Math.random() * 30 - 15),
                                    duration: 0.6,
                                    ease: "back.out(1.7)",
                                    onComplete: () => {
                                        // Return wrapper to normal (parallax will handle it)
                                        gsap.to(wrapper, {
                                            x: 0,
                                            y: 0,
                                            rotation: 0,
                                            duration: 1,
                                            ease: "power2.out"
                                        });
                                        
                                        // Restart continuous floating animation with new random direction
                                        const newDirectionAngle = Math.random() * 360;
                                        const newMovementDistance = 15 + Math.random() * 25;
                                        const newFloatX = Math.cos(newDirectionAngle * Math.PI / 180) * newMovementDistance;
                                        const newFloatY = Math.sin(newDirectionAngle * Math.PI / 180) * newMovementDistance;
                                        const newFloatDuration = 2 + Math.random() * 3;
                                        
                                        gsap.to(icon, {
                                            x: newFloatX,
                                            y: newFloatY,
                                            duration: newFloatDuration,
                                            ease: "sine.inOut",
                                            repeat: -1,
                                            yoyo: true
                                        });
                                        
                                        // Restart continuous rotation with new random speed and direction
                                        const newRotationSpeed = 15 + Math.random() * 25;
                                        const newRotationDir = Math.random() < 0.5 ? 360 : -360;
                                        gsap.to(icon, {
                                            rotation: `+=${newRotationDir}`,
                                            duration: newRotationSpeed,
                                            ease: "none",
                                            repeat: -1
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
                
                // Refresh ScrollTrigger after icons are created
                ScrollTrigger.refresh();
                
                // Debug: verify icons were created
                const createdIcons = floatingIconsContainer.querySelectorAll('.floating-tech-icon');
                const createdWrappers = floatingIconsContainer.querySelectorAll('[style*="position: absolute"]');
                console.log(`Total icons created: ${createdIcons.length}`);
                console.log(`Total wrappers created: ${createdWrappers.length}`);
                console.log('Floating icons container:', floatingIconsContainer);
            } else {
                console.error('Floating icons container not found!');
            } 

            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 3px;
                background-color: #2563eb; /* blue-600 */
                z-index: 10000;
                transition: width 0.1s ease;
            `;
            document.body.appendChild(progressBar);

            ScrollTrigger.create({
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                onUpdate: self => {
                    progressBar.style.width = `${self.progress * 100}%`;
                }
            });
        });

        // Tech Stack Tab Functionality
        document.addEventListener('DOMContentLoaded', function() {
            const tabs = document.querySelectorAll('.tech-tab');
            const panels = document.querySelectorAll('.tab-panel');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    panels.forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    const targetPanel = document.getElementById(tab.dataset.tab);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                    }
                });
            });
        });