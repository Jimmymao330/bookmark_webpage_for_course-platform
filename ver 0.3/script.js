document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM 元素獲取 ---
    const mainContainer = document.getElementById('main-container');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addBookmarkModal = document.getElementById('add-bookmark-modal');
    const addCategoryModal = document.getElementById('add-category-modal');
    const addBookmarkForm = document.getElementById('add-bookmark-form');
    const addCategoryForm = document.getElementById('add-category-form');
    const contextMenu = document.getElementById('context-menu');
    const startSortBtn = document.getElementById('start-sort-btn');
    const activeSortControls = document.getElementById('active-sort-controls');
    const saveSortBtn = document.getElementById('save-sort-btn');
    const cancelSortBtn = document.getElementById('cancel-sort-btn');
    const bookmarkColorInput = document.getElementById('bookmark-color');
    const resetColorBtn = document.getElementById('reset-color-btn');
    
    // --- 2. 狀態與資料管理 ---
    const STORAGE_KEY = 'myAdvancedBookmarks_v2';
    const DEFAULT_COLOR = '#74a2c2';
    let isSortModeActive = false;
    let data = null;
    let tempData = null;

    const defaultData = {
        columns: [
            [{ id: `cat-${Date.now()}-1`, name: "常用工具", bookmarks: [{ id: `bm-${Date.now()}-1`, name: "Google", url: "https://www.google.com", color: "#4285F4" }] }],
            [{ id: `cat-${Date.now()}-2`, name: "學習資源", bookmarks: [{ id: `bm-${Date.now()}-3`, name: "W3Schools", url: "https://www.w3schools.com", color: "#04AA6D" }] }]
        ]
    };

    function loadData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) return JSON.parse(storedData);
        
        const oldData = localStorage.getItem('myAdvancedBookmarks');
        if (oldData) {
            try {
                const parsedOldData = JSON.parse(oldData);
                if (Array.isArray(parsedOldData)) {
                    const migratedData = { columns: [[], []] };
                    parsedOldData.forEach((category, index) => {
                        migratedData.columns[index % 2].push(category);
                    });
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
                    return migratedData;
                }
            } catch (e) {
                console.error("無法解析舊資料:", e);
            }
        }
        return defaultData;
    }
    
    function saveDataAndRerender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        render();
    }

    // --- 3. 渲染邏輯 ---
    function render() {
        const dataToRender = isSortModeActive ? tempData : data;
        
        document.body.classList.toggle('sort-mode-active', isSortModeActive);
        startSortBtn.classList.toggle('hidden', isSortModeActive);
        activeSortControls.classList.toggle('hidden', !isSortModeActive);

        mainContainer.innerHTML = '';
        const columnElements = [document.createElement('div'), document.createElement('div')];
        columnElements.forEach((col, index) => { col.className = 'column'; col.dataset.columnIndex = index; });
        
        dataToRender.columns.forEach((columnData, columnIndex) => {
            columnData.forEach(category => {
                columnElements[columnIndex].appendChild(createCategoryElement(category));
            });
        });

        mainContainer.appendChild(columnElements[0]);
        mainContainer.appendChild(columnElements[1]);

        if (isSortModeActive) {
            addDragAndDropListeners();
        }
    }
    
    function createCategoryElement(category) {
        const categoryElement = document.createElement('section');
        categoryElement.className = 'category';
        categoryElement.dataset.id = category.id;
        categoryElement.draggable = isSortModeActive;
        if(isSortModeActive) categoryElement.classList.add('sortable-item');

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.dataset.id = category.id;
        
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name;
        
        const addBtn = document.createElement('button');
        addBtn.className = 'add-bookmark-btn';
        addBtn.textContent = '+';
        addBtn.dataset.categoryId = category.id;
        
        categoryHeader.appendChild(categoryTitle);
        categoryHeader.appendChild(addBtn);
        
        const bookmarkList = document.createElement('div');
        bookmarkList.className = 'bookmark-list';
        bookmarkList.dataset.categoryId = category.id;
        
        category.bookmarks.forEach(bookmark => bookmarkList.appendChild(createBookmarkElement(bookmark)));
        
        categoryElement.appendChild(categoryHeader);
        categoryElement.appendChild(bookmarkList);
        return categoryElement;
    }

    function createBookmarkElement(bookmark) {
        const bookmarkLink = document.createElement('a');
        bookmarkLink.href = bookmark.url;
        bookmarkLink.textContent = bookmark.name;
        bookmarkLink.className = 'bookmark-btn';
        bookmarkLink.target = '_blank';
        bookmarkLink.dataset.id = bookmark.id;
        bookmarkLink.draggable = isSortModeActive;
        if (isSortModeActive) bookmarkLink.classList.add('sortable-item');

        if (bookmark.color) {
            bookmarkLink.style.setProperty('--bookmark-bg-color', bookmark.color);
        }
        
        return bookmarkLink;
    }

    // --- 4. 輔助函數 ---
    function findCategory(categoryId, sourceData = data) {
        for (let colIndex = 0; colIndex < sourceData.columns.length; colIndex++) {
            const column = sourceData.columns[colIndex];
            const catIndex = column.findIndex(c => c.id === categoryId);
            if (catIndex > -1) return { category: column[catIndex], colIndex, catIndex };
        }
        return { category: null, colIndex: -1, catIndex: -1 };
    }
    function findBookmark(bookmarkId, sourceData = data) {
        for (const column of sourceData.columns) {
            for (const category of column) {
                const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
                if (bookmark) return [category, bookmark];
            }
        }
        return [null, null];
    }
    
    // --- 5. Modal 與右鍵選單處理 ---
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); modal.querySelector('form').reset(); }

    function handleBookmarkFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('bookmark-name').value;
        const url = document.getElementById('bookmark-url').value;
        const categoryId = document.getElementById('bookmark-category-id').value;
        const bookmarkId = document.getElementById('bookmark-id').value;
        const color = bookmarkColorInput.value;

        const { category } = findCategory(categoryId);
        if (!category) return;

        if (bookmarkId) { // Edit mode
            const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) { 
                bookmark.name = name; 
                bookmark.url = url; 
                bookmark.color = color;
            }
        } else { // Add mode
            category.bookmarks.push({ id: `bm-${Date.now()}`, name, url, color });
        }
        saveDataAndRerender();
        closeModal(addBookmarkModal);
    }

    function handleCategoryFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('category-name').value;
        const categoryId = document.getElementById('category-id').value;
        if (categoryId) { // Edit
            const { category } = findCategory(categoryId);
            if (category) category.name = name;
        } else { // Add
            if (name) {
                const targetCol = data.columns[0].length <= data.columns[1].length ? 0 : 1;
                data.columns[targetCol].push({ id: `cat-${Date.now()}`, name, bookmarks: [] });
            }
        }
        saveDataAndRerender();
        closeModal(addCategoryModal);
    }

    function handleContextMenu(e) {
        if (isSortModeActive) return;
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
        contextMenu.style.top = `${y}px`;
        contextMenu.style.left = `${x}px`;
        contextMenu.classList.remove('hidden');
    }

    function handleContextMenuClick(e) {
        const { action, id } = e.target.dataset;
        if (!action || !id) return;
        if (action === 'edit-bookmark') {
            const [cat, bookmark] = findBookmark(id);
            if (bookmark) { 
                addBookmarkModal.querySelector('h2').textContent = "編輯書籤";
                document.getElementById('bookmark-id').value = bookmark.id;
                document.getElementById('bookmark-name').value = bookmark.name;
                document.getElementById('bookmark-url').value = bookmark.url;
                bookmarkColorInput.value = bookmark.color || DEFAULT_COLOR;
                document.getElementById('bookmark-category-id').value = cat.id; 
                openModal(addBookmarkModal); 
            }
        } else if (action === 'delete-bookmark') {
            if (confirm('確定要刪除這個書籤嗎？')) { 
                const [cat] = findBookmark(id); 
                if (cat) { cat.bookmarks = cat.bookmarks.filter(b => b.id !== id); saveDataAndRerender(); }
            }
        } else if (action === 'edit-category') {
            const { category } = findCategory(id);
            if (category) { 
                addCategoryModal.querySelector('h2').textContent = "編輯類別";
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.name;
                openModal(addCategoryModal);
            }
        } else if (action === 'delete-category') {
            if (confirm('確定要刪除整個類別及其所有書籤嗎？')) { 
                const { colIndex, catIndex } = findCategory(id);
                if (colIndex > -1) { data.columns[colIndex].splice(catIndex, 1); saveDataAndRerender(); }
            }
        }
    }

    // --- 6. 拖放邏輯 ---
    function addDragAndDropListeners() {
        const draggables = document.querySelectorAll('.bookmark-btn, .category');
        const containers = document.querySelectorAll('.bookmark-list, .column');
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', e => { e.stopPropagation(); draggable.classList.add('dragging'); });
            draggable.addEventListener('dragend', e => { e.stopPropagation(); draggable.classList.remove('dragging'); });
        });
        containers.forEach(container => {
            container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('drag-over'); });
            container.addEventListener('dragleave', () => container.classList.remove('drag-over'));
            container.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('drag-over');
                const dragging = document.querySelector('.dragging');
                if (!dragging) return;
                if (dragging.classList.contains('bookmark-btn')) handleBookmarkDrop(dragging, e.target);
                else if (dragging.classList.contains('category')) handleCategoryDrop(dragging, e.target);
            });
        });
    }
    
    function handleBookmarkDrop(draggingElement, dropTargetElement) {
        const [sourceCat, bookmarkData] = findBookmark(draggingElement.dataset.id, tempData);
        const dropContainer = dropTargetElement.closest('.bookmark-list');
        if (!sourceCat || !bookmarkData || !dropContainer) return;
        const { category: targetCat } = findCategory(dropContainer.dataset.categoryId, tempData);
        if (!targetCat) return;
        sourceCat.bookmarks = sourceCat.bookmarks.filter(b => b.id !== bookmarkData.id);
        const dropOnBookmark = dropTargetElement.closest('.bookmark-btn');
        const targetIndex = dropOnBookmark ? targetCat.bookmarks.findIndex(b => b.id === dropOnBookmark.dataset.id) : targetCat.bookmarks.length;
        targetCat.bookmarks.splice(targetIndex, 0, bookmarkData);
        render();
    }
    
    function handleCategoryDrop(draggingElement, dropTargetElement) {
        const { category: categoryData, colIndex: sourceCol, catIndex: sourceCatIdx } = findCategory(draggingElement.dataset.id, tempData);
        const targetColumnEl = dropTargetElement.closest('.column');
        if (!categoryData || !targetColumnEl) return;
        const targetCol = parseInt(targetColumnEl.dataset.columnIndex);
        tempData.columns[sourceCol].splice(sourceCatIdx, 1);
        const dropOnCategory = dropTargetElement.closest('.category');
        const targetCatIdx = dropOnCategory ? tempData.columns[targetCol].findIndex(c => c.id === dropOnCategory.dataset.id) : tempData.columns[targetCol].length;
        tempData.columns[targetCol].splice(targetCatIdx, 0, categoryData);
        render();
    }

    // --- 7. 事件綁定 ---
    function bindEventListeners() {
        // 排序模式按鈕
        startSortBtn.addEventListener('click', () => {
            isSortModeActive = true;
            tempData = JSON.parse(JSON.stringify(data));
            render();
        });
        saveSortBtn.addEventListener('click', () => {
            isSortModeActive = false;
            data = tempData;
            tempData = null;
            saveDataAndRerender();
        });
        cancelSortBtn.addEventListener('click', () => {
            isSortModeActive = false;
            tempData = null;
            render();
        });

        // 新增類別/書籤按鈕
        addCategoryBtn.addEventListener('click', () => {
            if (isSortModeActive) return;
            addCategoryModal.querySelector('h2').textContent = "新增類別";
            document.getElementById('category-id').value = '';
            openModal(addCategoryModal);
        });
        
        mainContainer.addEventListener('click', e => {
            if (e.target.classList.contains('add-bookmark-btn')) {
                if (isSortModeActive) return;
                addBookmarkModal.querySelector('h2').textContent = "新增書籤";
                document.getElementById('bookmark-id').value = '';
                document.getElementById('bookmark-category-id').value = e.target.dataset.categoryId;
                bookmarkColorInput.value = DEFAULT_COLOR;
                openModal(addBookmarkModal);
            }
        });
        
        // 表單提交
        addBookmarkForm.addEventListener('submit', handleBookmarkFormSubmit);
        addCategoryForm.addEventListener('submit', handleCategoryFormSubmit);
        
        // 右鍵選單
        mainContainer.addEventListener('contextmenu', handleContextMenu);
        contextMenu.addEventListener('click', handleContextMenuClick);
        
        // 顏色重設按鈕
        resetColorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            bookmarkColorInput.value = DEFAULT_COLOR;
        });

        // 全域點擊事件 (關閉選單/視窗)
        window.addEventListener('click', () => contextMenu.classList.add('hidden'));
        document.querySelectorAll('.modal .close-btn, .modal').forEach(el => el.addEventListener('click', e => {
            if (e.target === el) { closeModal(addBookmarkModal); closeModal(addCategoryModal); }
        }));
        document.querySelectorAll('.modal-content').forEach(el => el.addEventListener('click', e => e.stopPropagation()));
    }

    // --- 啟動應用 ---
    data = loadData();
    bindEventListeners();
    render();
});