document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM 元素獲取 ---
    const mainContainer = document.getElementById('main-container');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addBookmarkModal = document.getElementById('add-bookmark-modal');
    const addCategoryModal = document.getElementById('add-category-modal');
    const addBookmarkForm = document.getElementById('add-bookmark-form');
    const addCategoryForm = document.getElementById('add-category-form');
    const contextMenu = document.getElementById('context-menu');

    // --- 2. 資料管理 ---
    const STORAGE_KEY = 'myAdvancedBookmarks_v2'; // 使用 v2 鍵值
    const defaultData = {
        columns: [
            [{ id: `cat-${Date.now()}-1`, name: "常用工具", bookmarks: [{ id: `bm-${Date.now()}-1`, name: "Google", url: "https://www.google.com" }] }],
            [{ id: `cat-${Date.now()}-2`, name: "學習資源", bookmarks: [{ id: `bm-${Date.now()}-3`, name: "W3Schools", url: "https://www.w3schools.com" }] }]
        ]
    };
    
    function loadData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) return JSON.parse(storedData);
        
        const oldData = localStorage.getItem('myAdvancedBookmarks');
        if (oldData) {
            const parsedOldData = JSON.parse(oldData);
            if (Array.isArray(parsedOldData)) {
                const migratedData = { columns: [[], []] };
                parsedOldData.forEach((category, index) => {
                    migratedData.columns[index % 2].push(category);
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
                return migratedData;
            }
        }
        return defaultData;
    }
    let data = loadData();

    function saveDataAndRerender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        render();
    }

    // --- 3. 渲染邏輯 ---
    function render() {
        mainContainer.innerHTML = '';
        const columnElements = [document.createElement('div'), document.createElement('div')];
        columnElements.forEach((col, index) => {
            col.className = 'column';
            col.dataset.columnIndex = index;
        });
        data.columns.forEach((columnData, columnIndex) => {
            columnData.forEach(category => {
                columnElements[columnIndex].appendChild(createCategoryElement(category));
            });
        });
        mainContainer.appendChild(columnElements[0]);
        mainContainer.appendChild(columnElements[1]);
        addDragAndDropListeners();
    }
    
    function createCategoryElement(category) {
        const categoryElement = document.createElement('section');
        categoryElement.className = 'category'; categoryElement.dataset.id = category.id; categoryElement.draggable = true;
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header'; categoryHeader.dataset.id = category.id;
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name;
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bookmark-btn'; addBtn.textContent = '+'; addBtn.dataset.categoryId = category.id;
        categoryHeader.appendChild(categoryTitle); categoryHeader.appendChild(addBtn);
        const bookmarkList = document.createElement('div');
        bookmarkList.className = 'bookmark-list'; bookmarkList.dataset.categoryId = category.id;
        category.bookmarks.forEach(bookmark => bookmarkList.appendChild(createBookmarkElement(bookmark)));
        categoryElement.appendChild(categoryHeader); categoryElement.appendChild(bookmarkList);
        return categoryElement;
    }

    function createBookmarkElement(bookmark) {
        const bookmarkLink = document.createElement('a');
        bookmarkLink.href = bookmark.url; bookmarkLink.textContent = bookmark.name; bookmarkLink.className = 'bookmark-btn';
        bookmarkLink.target = '_blank'; bookmarkLink.draggable = true; bookmarkLink.dataset.id = bookmark.id;
        return bookmarkLink;
    }

    // --- 4. 輔助函數 (尋找資料) ---
    function findCategory(categoryId) {
        for (let colIndex = 0; colIndex < data.columns.length; colIndex++) {
            const column = data.columns[colIndex];
            const catIndex = column.findIndex(c => c.id === categoryId);
            if (catIndex > -1) return { category: column[catIndex], colIndex, catIndex };
        }
        return { category: null, colIndex: -1, catIndex: -1 };
    }
    function findBookmark(bookmarkId) {
        for (const column of data.columns) {
            for (const category of column) {
                const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
                if (bookmark) return [category, bookmark];
            }
        }
        return [null, null];
    }
    
    // --- 5. Modal 彈出視窗管理 ---
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); modal.querySelector('form').reset(); }

    // --- 6. 事件處理函數 ---
    function handleBookmarkFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('bookmark-name').value;
        const url = document.getElementById('bookmark-url').value;
        const categoryId = document.getElementById('bookmark-category-id').value;
        const bookmarkId = document.getElementById('bookmark-id').value;
        
        const { category } = findCategory(categoryId);
        if (!category) {
            console.error("錯誤：找不到類別 ID", categoryId);
            return;
        }

        if (bookmarkId) { // 編輯模式
            const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) { bookmark.name = name; bookmark.url = url; }
        } else { // 新增模式
            category.bookmarks.push({ id: `bm-${Date.now()}`, name, url });
        }
        saveDataAndRerender();
        closeModal(addBookmarkModal);
    }

    function handleCategoryFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('category-name').value;
        const categoryId = document.getElementById('category-id').value;
        if (categoryId) { // 編輯
            const { category } = findCategory(categoryId);
            if (category) category.name = name;
        } else { // 新增 (加到較少的那一欄)
            if (name) {
                const targetCol = data.columns[0].length <= data.columns[1].length ? 0 : 1;
                data.columns[targetCol].push({ id: `cat-${Date.now()}`, name, bookmarks: [] });
            }
        }
        saveDataAndRerender();
        closeModal(addCategoryModal);
    }

    function handleContextMenu(e) {
        e.preventDefault();
        const bookmarkTarget = e.target.closest('.bookmark-btn');
        const categoryTarget = e.target.closest('.category-header');
        if (bookmarkTarget) showContextMenu(e.pageX, e.pageY, 'bookmark', bookmarkTarget.dataset.id);
        else if (categoryTarget) showContextMenu(e.pageX, e.pageY, 'category', categoryTarget.dataset.id);
    }
    function showContextMenu(x, y, type, id) {
        const ul = contextMenu.querySelector('ul');
        ul.innerHTML = '';
        if (type === 'bookmark') ul.innerHTML = `<li data-action="edit-bookmark" data-id="${id}">編輯書籤</li><li data-action="delete-bookmark" data-id="${id}" class="delete">刪除書籤</li>`;
        else if (type === 'category') ul.innerHTML = `<li data-action="edit-category" data-id="${id}">編輯類別</li><li data-action="delete-category" data-id="${id}" class="delete">刪除類別</li>`;
        contextMenu.style.top = `${y}px`; contextMenu.style.left = `${x}px`;
        contextMenu.classList.remove('hidden');
    }
    function handleContextMenuClick(e) {
        const { action, id } = e.target.dataset; if (!action || !id) return;
        if (action === 'edit-bookmark') {
            const [cat, bookmark] = findBookmark(id);
            if (bookmark) { addBookmarkModal.querySelector('h2').textContent = "編輯書籤"; ['id', 'name', 'url'].forEach(p => document.getElementById(`bookmark-${p}`).value = bookmark[p]); document.getElementById('bookmark-category-id').value = cat.id; openModal(addBookmarkModal); }
        } else if (action === 'delete-bookmark') {
            if (confirm('確定要刪除這個書籤嗎？')) { const [cat] = findBookmark(id); if (cat) { cat.bookmarks = cat.bookmarks.filter(b => b.id !== id); saveDataAndRerender(); } }
        } else if (action === 'edit-category') {
            const { category } = findCategory(id);
            if (category) { addCategoryModal.querySelector('h2').textContent = "編輯類別"; document.getElementById('category-id').value = category.id; document.getElementById('category-name').value = category.name; openModal(addCategoryModal); }
        } else if (action === 'delete-category') {
            if (confirm('確定要刪除整個類別及其所有書籤嗎？')) { const { colIndex, catIndex } = findCategory(id); if (colIndex > -1) { data.columns[colIndex].splice(catIndex, 1); saveDataAndRerender(); } }
        }
    }

    // --- 7. 拖放邏輯 ---
    function addDragAndDropListeners() {
        const draggables = document.querySelectorAll('.bookmark-btn, .category');
        const containers = document.querySelectorAll('.bookmark-list, .column');
        draggables.forEach(draggable => { draggable.addEventListener('dragstart', (e) => { e.stopPropagation(); draggable.classList.add('dragging'); }); draggable.addEventListener('dragend', (e) => { e.stopPropagation(); draggable.classList.remove('dragging'); }); });
        containers.forEach(container => {
            container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('drag-over'); });
            container.addEventListener('dragleave', () => container.classList.remove('drag-over'));
            container.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); container.classList.remove('drag-over'); const dragging = document.querySelector('.dragging'); if (!dragging) return;
                if (dragging.classList.contains('bookmark-btn')) handleBookmarkDrop(dragging, e.target);
                else if (dragging.classList.contains('category')) handleCategoryDrop(dragging, e.target);
            });
        });
    }
    function handleBookmarkDrop(draggingElement, dropTargetElement) {
        const [sourceCat, bookmarkData] = findBookmark(draggingElement.dataset.id);
        const dropContainer = dropTargetElement.closest('.bookmark-list');
        if (!sourceCat || !bookmarkData || !dropContainer) return;
        const { category: targetCat } = findCategory(dropContainer.dataset.categoryId);
        if (!targetCat) return;
        sourceCat.bookmarks = sourceCat.bookmarks.filter(b => b.id !== bookmarkData.id);
        const dropOnBookmark = dropTargetElement.closest('.bookmark-btn');
        const targetIndex = dropOnBookmark ? targetCat.bookmarks.findIndex(b => b.id === dropOnBookmark.dataset.id) : targetCat.bookmarks.length;
        targetCat.bookmarks.splice(targetIndex, 0, bookmarkData);
        saveDataAndRerender();
    }
    function handleCategoryDrop(draggingElement, dropTargetElement) {
        const { category: categoryData, colIndex: sourceCol, catIndex: sourceCatIdx } = findCategory(draggingElement.dataset.id);
        const targetColumnEl = dropTargetElement.closest('.column');
        if (!categoryData || !targetColumnEl) return;
        const targetCol = parseInt(targetColumnEl.dataset.columnIndex);
        data.columns[sourceCol].splice(sourceCatIdx, 1);
        const dropOnCategory = dropTargetElement.closest('.category');
        const targetCatIdx = dropOnCategory ? data.columns[targetCol].findIndex(c => c.id === dropOnCategory.dataset.id) : data.columns[targetCol].length;
        data.columns[targetCol].splice(targetCatIdx, 0, categoryData);
        saveDataAndRerender();
    }

    // --- 8. 初始設定與事件綁定 ---
    function bindEventListeners() {
        addCategoryBtn.addEventListener('click', () => {
            addCategoryModal.querySelector('h2').textContent = "新增類別";
            document.getElementById('category-id').value = '';
            openModal(addCategoryModal);
        });
        mainContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-bookmark-btn')) {
                addBookmarkModal.querySelector('h2').textContent = "新增書籤";
                document.getElementById('bookmark-id').value = '';
                document.getElementById('bookmark-category-id').value = e.target.dataset.categoryId;
                openModal(addBookmarkModal);
            }
        });
        addBookmarkForm.addEventListener('submit', handleBookmarkFormSubmit);
        addCategoryForm.addEventListener('submit', handleCategoryFormSubmit);
        mainContainer.addEventListener('contextmenu', handleContextMenu);
        contextMenu.addEventListener('click', handleContextMenuClick);
        window.addEventListener('click', () => contextMenu.classList.add('hidden'));
        document.querySelectorAll('.modal .close-btn, .modal').forEach(el => el.addEventListener('click', (e) => { if (e.target === el) { closeModal(addBookmarkModal); closeModal(addCategoryModal); } }));
        document.querySelectorAll('.modal-content').forEach(el => el.addEventListener('click', e => e.stopPropagation()));
    }

    // --- 啟動 ---
    bindEventListeners();
    render();
});