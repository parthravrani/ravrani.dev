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

            // Blog Filter and Search Functionality
            const blogCards = document.querySelectorAll('.blog-card');
            const searchInput = document.getElementById('search-input');
            const filterButtons = document.querySelectorAll('.filter-btn');
            const tagFilters = document.querySelectorAll('.tag-filter');
            const noResults = document.getElementById('no-results');
            const paginationContainer = document.getElementById('pagination');
            const filterToggleBtn = document.getElementById('filter-toggle-btn');
            const filterPopup = document.getElementById('filter-popup');
            const filterBackdrop = document.getElementById('filter-backdrop');
            const filterCloseBtn = document.getElementById('filter-close-btn');
            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            const clearFiltersBtn = document.getElementById('clear-filters-btn');

            // Exit early if required elements don't exist
            if (!searchInput || !paginationContainer || blogCards.length === 0) {
                console.warn('Blog listing elements not found, skipping blog-specific functionality');
                return;
            }

            let currentCategory = 'all';
            let currentTags = [];
            let pendingCategory = 'all';
            let pendingTags = [];
            let currentSearch = '';
            let currentPage = 1;
            const postsPerPage = 10;

            // Filter Popup Toggle
            function openFilterPopup() {
                filterPopup.classList.remove('hidden');
                filterBackdrop.classList.remove('hidden');
                filterToggleBtn.classList.add('active');
                syncPendingFilters();
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }

            function closeFilterPopup() {
                filterPopup.classList.add('hidden');
                filterBackdrop.classList.add('hidden');
                filterToggleBtn.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            }

            const filterIndicator = document.getElementById('filter-indicator');
            
            if (filterToggleBtn && filterPopup && filterBackdrop) {
                const togglePopup = (e) => {
                    e.stopPropagation();
                    if (filterPopup.classList.contains('hidden')) {
                        openFilterPopup();
                    } else {
                        closeFilterPopup();
                    }
                };
                
                filterToggleBtn.addEventListener('click', togglePopup);
                
                // Make filter indicator clickable
                if (filterIndicator) {
                    filterIndicator.addEventListener('click', togglePopup);
                }

                filterCloseBtn?.addEventListener('click', () => {
                    closeFilterPopup();
                });

                // Close popup when clicking backdrop
                filterBackdrop.addEventListener('click', () => {
                    closeFilterPopup();
                });

                // Prevent popup from closing when clicking inside it
                filterPopup.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // Close on Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && !filterPopup.classList.contains('hidden')) {
                        closeFilterPopup();
                    }
                });
            }

            function filterBlogPosts() {
                let visiblePosts = [];
                
                blogCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    const tags = card.getAttribute('data-tags')?.split(',').map(t => t.trim()) || [];
                    const title = card.querySelector('h2 a').textContent.toLowerCase();
                    const description = card.querySelector('p').textContent.toLowerCase();
                    
                    // Category filter
                    const categoryMatch = currentCategory === 'all' || category === currentCategory;
                    
                    // Tag filter
                    const tagMatch = currentTags.length === 0 || currentTags.some(tag => tags.includes(tag));
                    
                    // Search filter
                    const searchMatch = currentSearch === '' || 
                        title.includes(currentSearch.toLowerCase()) || 
                        description.includes(currentSearch.toLowerCase());
                    
                    if (categoryMatch && tagMatch && searchMatch) {
                        visiblePosts.push(card);
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                });

                // Show/hide no results message
                if (visiblePosts.length === 0) {
                    noResults.classList.remove('hidden');
                } else {
                    noResults.classList.add('hidden');
                }

                // Update pagination
                updatePagination(visiblePosts);
            }

            function updatePagination(visiblePosts) {
                const totalPages = Math.ceil(visiblePosts.length / postsPerPage);
                paginationContainer.innerHTML = '';

                if (totalPages <= 1) {
                    paginationContainer.style.display = 'none';
                    return;
                }

                paginationContainer.style.display = 'flex';

                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.className = 'pagination-btn';
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                prevBtn.disabled = currentPage === 1;
                prevBtn.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        showPage();
                    }
                });
                paginationContainer.appendChild(prevBtn);

                // Page numbers - show max 5 pages
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 4);
                
                if (endPage - startPage < 4) {
                    startPage = Math.max(1, endPage - 4);
                }

                if (startPage > 1) {
                    const firstBtn = document.createElement('button');
                    firstBtn.className = 'pagination-btn';
                    firstBtn.textContent = '1';
                    firstBtn.addEventListener('click', () => {
                        currentPage = 1;
                        showPage();
                    });
                    paginationContainer.appendChild(firstBtn);
                    
                    if (startPage > 2) {
                        const ellipsis = document.createElement('span');
                        ellipsis.className = 'px-2 text-gray-400';
                        ellipsis.textContent = '...';
                        paginationContainer.appendChild(ellipsis);
                    }
                }

                for (let i = startPage; i <= endPage; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = 'pagination-btn';
                    if (i === currentPage) {
                        pageBtn.classList.add('active');
                    }
                    pageBtn.textContent = i;
                    pageBtn.addEventListener('click', () => {
                        currentPage = i;
                        showPage();
                    });
                    paginationContainer.appendChild(pageBtn);
                }

                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        const ellipsis = document.createElement('span');
                        ellipsis.className = 'px-2 text-gray-400';
                        ellipsis.textContent = '...';
                        paginationContainer.appendChild(ellipsis);
                    }
                    
                    const lastBtn = document.createElement('button');
                    lastBtn.className = 'pagination-btn';
                    lastBtn.textContent = totalPages;
                    lastBtn.addEventListener('click', () => {
                        currentPage = totalPages;
                        showPage();
                    });
                    paginationContainer.appendChild(lastBtn);
                }

                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.className = 'pagination-btn';
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                nextBtn.disabled = currentPage === totalPages;
                nextBtn.addEventListener('click', () => {
                    if (currentPage < totalPages) {
                        currentPage++;
                        showPage();
                    }
                });
                paginationContainer.appendChild(nextBtn);
            }

            function showPage() {
                const visiblePosts = Array.from(blogCards).filter(card => !card.classList.contains('hidden'));
                const startIndex = (currentPage - 1) * postsPerPage;
                const endIndex = startIndex + postsPerPage;

                // Hide all cards first (only if pagination is needed)
                if (visiblePosts.length > postsPerPage) {
                    blogCards.forEach(card => {
                        if (!card.classList.contains('hidden')) {
                            card.style.display = 'none';
                        }
                    });

                    // Show only cards for current page
                    visiblePosts.forEach((card, index) => {
                        if (index >= startIndex && index < endIndex) {
                            card.style.display = '';
                        }
                    });
                } else {
                    // Show all visible cards if pagination not needed
                    blogCards.forEach(card => {
                        if (!card.classList.contains('hidden')) {
                            card.style.display = '';
                        }
                    });
                }

                updatePagination(visiblePosts);
            }
            
            // Function to update filter indicator
            function updateFilterIndicator() {
                const filterIndicator = document.getElementById('filter-indicator');
                const filterCount = document.getElementById('filter-count');
                const clearFiltersQuick = document.getElementById('clear-filters-quick');
                
                if (!filterIndicator || !filterCount) return;
                
                let activeFilterCount = 0;
                if (currentCategory !== 'all') activeFilterCount++;
                activeFilterCount += currentTags.length;
                
                if (activeFilterCount > 0 || currentSearch.trim() !== '') {
                    const totalFilters = activeFilterCount + (currentSearch.trim() !== '' ? 1 : 0);
                    filterCount.textContent = totalFilters;
                    filterIndicator.classList.remove('hidden');
                    if (clearFiltersQuick) clearFiltersQuick.classList.remove('hidden');
                } else {
                    filterIndicator.classList.add('hidden');
                    if (clearFiltersQuick) clearFiltersQuick.classList.add('hidden');
                }
            }
            
            // Quick Clear Filters Button
            const clearFiltersQuick = document.getElementById('clear-filters-quick');
            if (clearFiltersQuick) {
                clearFiltersQuick.addEventListener('click', () => {
                    // Reset pending filters
                    pendingCategory = 'all';
                    pendingTags = [];
                    
                    // Reset UI
                    filterButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.getAttribute('data-filter') === 'all') {
                            btn.classList.add('active');
                        }
                    });
                    
                    tagFilters.forEach(tag => tag.classList.remove('active'));
                    
                    // Apply cleared filters immediately
                    currentCategory = 'all';
                    currentTags = [];
                    currentSearch = '';
                    searchInput.value = '';
                    currentPage = 1;
                    
                    filterBlogPosts();
                    updateFilterIndicator();
                    showPage();
                });
            }

            // Search input event
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                currentPage = 1;
                filterBlogPosts();
                updateFilterIndicator();
                const visiblePosts = Array.from(blogCards).filter(card => !card.classList.contains('hidden'));
                if (visiblePosts.length > 0) {
                    showPage();
                }
            });

            // Category filter buttons (update pending selection)
            filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    pendingCategory = btn.getAttribute('data-filter');
                });
            });

            // Tag filter buttons (update pending selection)
            tagFilters.forEach(tag => {
                tag.addEventListener('click', () => {
                    const tagValue = tag.getAttribute('data-tag');
                    if (tag.classList.contains('active')) {
                        tag.classList.remove('active');
                        pendingTags = pendingTags.filter(t => t !== tagValue);
                    } else {
                        tag.classList.add('active');
                        if (!pendingTags.includes(tagValue)) {
                            pendingTags.push(tagValue);
                        }
                    }
                });
            });

            // Apply Filters button
            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    // Apply pending filters to current filters
                    currentCategory = pendingCategory;
                    currentTags = [...pendingTags];
                    currentPage = 1;
                    
                    filterBlogPosts();
                    updateFilterIndicator();
                    const visiblePosts = Array.from(blogCards).filter(card => !card.classList.contains('hidden'));
                    if (visiblePosts.length > 0) {
                        showPage();
                    }
                    
                    // Close popup
                    closeFilterPopup();
                });
            }

            // Clear Filters button
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    // Reset pending filters
                    pendingCategory = 'all';
                    pendingTags = [];
                    
                    // Reset UI
                    filterButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.getAttribute('data-filter') === 'all') {
                            btn.classList.add('active');
                        }
                    });
                    
                    tagFilters.forEach(tag => tag.classList.remove('active'));
                    
                    // Apply cleared filters immediately
                    currentCategory = 'all';
                    currentTags = [];
                    currentSearch = '';
                    searchInput.value = '';
                    currentPage = 1;
                    
                    filterBlogPosts();
                    updateFilterIndicator();
                    showPage();
                    
                    // Close popup
                    closeFilterPopup();
                });
            }

            // Initialize pending filters to match current filters
            function syncPendingFilters() {
                pendingCategory = currentCategory;
                pendingTags = [...currentTags];
                
                // Update UI to reflect current filters
                filterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-filter') === currentCategory) {
                        btn.classList.add('active');
                    }
                });
                
                tagFilters.forEach(tag => {
                    tag.classList.remove('active');
                    if (currentTags.includes(tag.getAttribute('data-tag'))) {
                        tag.classList.add('active');
                    }
                });
            }

            // Initialize
            syncPendingFilters();
            filterBlogPosts();
            updateFilterIndicator();
            showPage();
        });