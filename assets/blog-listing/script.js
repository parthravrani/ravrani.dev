document.addEventListener('DOMContentLoaded', function () {
    const blogCards = document.querySelectorAll('.blog-list-item');
    const searchInput = document.getElementById('search-input');
    const tagFilters = document.querySelectorAll('.tag-filter');
    const noResults = document.getElementById('no-results');
    const paginationContainer = document.getElementById('pagination');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filterPopup = document.getElementById('filter-popup');
    const filterBackdrop = document.getElementById('filter-backdrop');
    const filterCloseBtn = document.getElementById('filter-close-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterCount = document.getElementById('filter-count');
    const filterCountNum = document.getElementById('filter-count-num');
    const clearFiltersQuick = document.getElementById('clear-filters-quick');

    if (!searchInput || !paginationContainer || blogCards.length === 0) return;

    let currentTags = [];
    let pendingTags = [];
    let currentSearch = '';
    let currentPage = 1;
    const postsPerPage = 10;

    function openFilterPopup() {
        filterPopup.classList.remove('hidden');
        filterBackdrop.classList.remove('hidden');
        filterToggleBtn.classList.add('active');
        syncPendingFilters();
        document.body.style.overflow = 'hidden';
    }

    function closeFilterPopup() {
        filterPopup.classList.add('hidden');
        filterBackdrop.classList.add('hidden');
        filterToggleBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    function getCardText(card) {
        const title = card.querySelector('.home-post-row-title, .home-post-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.home-post-row-excerpt, .home-post-excerpt')?.textContent.toLowerCase() || '';
        return { title, description };
    }

    function filterBlogPosts() {
        const visiblePosts = [];

        blogCards.forEach(card => {
            const tags = card.getAttribute('data-tags')?.split(',').map(t => t.trim()).filter(Boolean) || [];
            const { title, description } = getCardText(card);
            const tagMatch = currentTags.length === 0 || currentTags.some(tag => tags.includes(tag));
            const searchMatch = currentSearch === '' ||
                title.includes(currentSearch.toLowerCase()) ||
                description.includes(currentSearch.toLowerCase());

            if (tagMatch && searchMatch) {
                visiblePosts.push(card);
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });

        if (noResults) {
            noResults.classList.toggle('hidden', visiblePosts.length > 0);
        }

        updatePagination(visiblePosts);
        return visiblePosts;
    }

    function updatePagination(visiblePosts) {
        const totalPages = Math.ceil(visiblePosts.length / postsPerPage);
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            showPage(visiblePosts);
            return;
        }

        paginationContainer.style.display = 'flex';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'blog-pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                showPage(visiblePosts);
                updatePagination(visiblePosts);
            }
        });
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'blog-pagination-btn' + (i === currentPage ? ' active' : '');
            pageBtn.textContent = String(i);
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                showPage(visiblePosts);
                updatePagination(visiblePosts);
            });
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'blog-pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                showPage(visiblePosts);
                updatePagination(visiblePosts);
            }
        });
        paginationContainer.appendChild(nextBtn);

        showPage(visiblePosts);
    }

    function showPage(visiblePosts) {
        const posts = visiblePosts || Array.from(blogCards).filter(card => !card.classList.contains('hidden'));
        const startIndex = (currentPage - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;

        if (posts.length > postsPerPage) {
            blogCards.forEach(card => {
                if (!card.classList.contains('hidden')) card.style.display = 'none';
            });
            posts.forEach((card, index) => {
                if (index >= startIndex && index < endIndex) card.style.display = '';
            });
        } else {
            blogCards.forEach(card => {
                if (!card.classList.contains('hidden')) card.style.display = '';
            });
        }
    }

    function updateFilterIndicator() {
        const activeCount = currentTags.length + (currentSearch.trim() ? 1 : 0);
        if (filterCount && filterCountNum) {
            if (activeCount > 0) {
                filterCountNum.textContent = String(activeCount);
                filterCount.classList.remove('hidden');
                clearFiltersQuick?.classList.remove('hidden');
            } else {
                filterCount.classList.add('hidden');
                clearFiltersQuick?.classList.add('hidden');
            }
        }
    }

    function syncPendingFilters() {
        pendingTags = [...currentTags];
        tagFilters.forEach(tag => {
            const value = tag.getAttribute('data-tag');
            tag.classList.toggle('active', pendingTags.includes(value));
        });
    }

    function clearAllFilters() {
        pendingTags = [];
        currentTags = [];
        currentSearch = '';
        searchInput.value = '';
        currentPage = 1;
        tagFilters.forEach(tag => tag.classList.remove('active'));
        const visible = filterBlogPosts();
        updateFilterIndicator();
        showPage(visible);
    }

    filterToggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        filterPopup.classList.contains('hidden') ? openFilterPopup() : closeFilterPopup();
    });

    filterCount?.addEventListener('click', () => openFilterPopup());
    filterCloseBtn?.addEventListener('click', closeFilterPopup);
    filterBackdrop?.addEventListener('click', closeFilterPopup);
    filterPopup?.addEventListener('click', e => e.stopPropagation());

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !filterPopup.classList.contains('hidden')) closeFilterPopup();
    });

    searchInput.addEventListener('input', e => {
        currentSearch = e.target.value;
        currentPage = 1;
        const visible = filterBlogPosts();
        updateFilterIndicator();
        showPage(visible);
    });

    tagFilters.forEach(tag => {
        tag.addEventListener('click', () => {
            const value = tag.getAttribute('data-tag');
            if (tag.classList.contains('active')) {
                tag.classList.remove('active');
                pendingTags = pendingTags.filter(t => t !== value);
            } else {
                tag.classList.add('active');
                if (!pendingTags.includes(value)) pendingTags.push(value);
            }
        });
    });

    applyFiltersBtn?.addEventListener('click', () => {
        currentTags = [...pendingTags];
        currentPage = 1;
        const visible = filterBlogPosts();
        updateFilterIndicator();
        showPage(visible);
        closeFilterPopup();
    });

    clearFiltersBtn?.addEventListener('click', () => {
        clearAllFilters();
        closeFilterPopup();
    });

    clearFiltersQuick?.addEventListener('click', clearAllFilters);

    filterBlogPosts();
    updateFilterIndicator();
});
