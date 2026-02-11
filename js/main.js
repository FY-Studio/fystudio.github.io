// 资源站主JavaScript文件
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let selectedFiles = new Set();
    let currentPath = '.';
    let allFiles = [];
    let currentFiles = [];

    // DOM元素
    const fileList = document.getElementById('fileList');
    const fileListContainer = document.getElementById('fileListContainer');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const breadcrumb = document.getElementById('breadcrumb');
    const contextMenu = document.getElementById('contextMenu');
    const searchInput = document.getElementById('searchInput');

    // 按钮
    const backBtn = document.getElementById('backBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');

    // 文件类型图标映射
    const fileIcons = {
        'folder': 'bi-folder-fill',
        'zip': 'bi-file-earmark-zip-fill',
        'rar': 'bi-file-earmark-zip-fill',
        '7z': 'bi-file-earmark-zip-fill',
        'pdf': 'bi-file-earmark-pdf-fill',
        'jpg': 'bi-file-image-fill',
        'jpeg': 'bi-file-image-fill',
        'png': 'bi-file-image-fill',
        'gif': 'bi-file-image-fill',
        'txt': 'bi-file-text-fill',
        'md': 'bi-file-text-fill',
        'doc': 'bi-file-earmark-word-fill',
        'docx': 'bi-file-earmark-word-fill',
        'xls': 'bi-file-earmark-excel-fill',
        'xlsx': 'bi-file-earmark-excel-fill',
        'ppt': 'bi-file-earmark-ppt-fill',
        'pptx': 'bi-file-earmark-ppt-fill',
        'mp3': 'bi-file-music-fill',
        'mp4': 'bi-file-play-fill',
        'avi': 'bi-file-play-fill',
        'mov': 'bi-file-play-fill',
        'html': 'bi-file-code-fill',
        'css': 'bi-file-code-fill',
        'js': 'bi-file-code-fill',
        'json': 'bi-file-code-fill',
        'php': 'bi-file-code-fill',
        'py': 'bi-file-code-fill',
        'java': 'bi-file-code-fill',
        'cpp': 'bi-file-code-fill',
        'c': 'bi-file-code-fill',
        'default': 'bi-file-earmark-fill'
    };

    // 文件类型颜色
    const fileTypeColors = {
        'folder': 'folder-icon',
        'zip': 'file-icon-zip',
        'rar': 'file-icon-zip',
        '7z': 'file-icon-zip',
        'pdf': 'file-icon-pdf',
        'jpg': 'file-icon-image',
        'jpeg': 'file-icon-image',
        'png': 'file-icon-image',
        'gif': 'file-icon-image',
        'mp4': 'file-icon-video',
        'avi': 'file-icon-video',
        'mov': 'file-icon-video',
        'txt': 'file-icon-text',
        'md': 'file-icon-text',
        'default': 'file-icon-default'
    };

    // 初始化
    init();

    async function init() {
        setupEventListeners();
        await loadFiles(currentPath);
    }

    function setupEventListeners() {
        // 返回上一级
        backBtn.addEventListener('click', goBack);

        // 刷新
        refreshBtn.addEventListener('click', () => loadFiles(currentPath));

        // 全选按钮
        selectAllBtn.addEventListener('click', selectAllFiles);
        selectAllCheckbox.addEventListener('change', toggleSelectAll);

        // 下载选中文件
        downloadSelectedBtn.addEventListener('click', downloadSelectedFiles);

        // 搜索功能
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        document.getElementById('searchBtn').addEventListener('click', () => handleSearch());

        // 右键菜单
        setupContextMenu();

        // 点击其他地方隐藏右键菜单
        document.addEventListener('click', hideContextMenu);

        // 键盘快捷键
        document.addEventListener('keydown', handleKeyDown);
    }

    async function loadFiles(path = '.') {
        showLoading();
        currentPath = path;

        try {
            // 通过GitHub API获取文件列表
            const files = await fetchFilesFromGitHub(path);
            allFiles = files;
            currentFiles = files;
            displayFiles(files);
            updateBreadcrumb(path);
            hideLoading();
            updateDownloadButton();
        } catch (error) {
            console.error('加载文件失败:', error);
            hideLoading();
            showEmptyState();

            // 如果GitHub API失败，显示模拟数据用于测试
            displayMockFiles();
        }
    }

    async function fetchFilesFromGitHub(path) {
        // GitHub API 地址
        const apiUrl = `https://api.github.com/repos/FY-Studio/fystudio.github.io/contents/${path === '.' ? '' : path}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`GitHub API 错误: ${response.status}`);
            }

            const data = await response.json();

            // 处理GitHub API返回的数据
            return data.map(item => {
                const isDir = item.type === 'dir';
                const ext = isDir ? '' : getFileExtension(item.name);

                return {
                    name: item.name,
                    type: isDir ? 'folder' : 'file',
                    path: item.path,
                    size: formatFileSize(item.size || 0),
                            modified: formatDate(item.updated_at || item.created_at),
                            downloadUrl: item.download_url,
                            htmlUrl: item.html_url,
                            ext: ext
                };
            });
        } catch (error) {
            console.error('获取GitHub文件失败:', error);
            throw error;
        }
    }

    function displayMockFiles() {
        // 仅供测试使用的模拟数据
        const mockFiles = [
            {
                name: 'uploads',
                type: 'folder',
                path: './uploads',
                size: '0 B',
                modified: '刚刚',
                downloadUrl: '',
                htmlUrl: '',
                ext: ''
            }
        ];

        allFiles = mockFiles;
        currentFiles = mockFiles;
        displayFiles(mockFiles);
        updateBreadcrumb(currentPath);
        hideLoading();
    }

    function displayFiles(files) {
        fileList.innerHTML = '';

        if (files.length === 0) {
            showEmptyState();
            return;
        }

        hideEmptyState();

        files.forEach((file, index) => {
            const row = createFileRow(file, index);
            fileList.appendChild(row);
        });

        updateSelectAllCheckbox();
    }

    function createFileRow(file, index) {
        const row = document.createElement('tr');
        row.className = 'file-item';
        row.dataset.path = file.path;
        row.dataset.type = file.type;
        row.dataset.index = index;

        const isSelected = selectedFiles.has(file.path);
        if (isSelected) {
            row.classList.add('selected');
        }

        const fileIcon = getFileIcon(file);
        const fileIconClass = getFileIconClass(file);

        row.innerHTML = `
        <td>
        <input type="checkbox" class="form-check-input file-checkbox"
        data-path="${file.path}"
        ${isSelected ? 'checked' : ''}>
        </td>
        <td>
        <span class="file-icon ${fileIconClass}">
        <i class="bi ${fileIcon}"></i>
        </span>
        </td>
        <td>
        <div class="d-flex align-items-center">
        <span class="file-icon me-2">
        <i class="bi ${fileIcon}"></i>
        </span>
        <span class="file-name">${file.name}</span>
        </div>
        </td>
        <td><small class="text-muted">${file.size}</small></td>
        <td><small class="text-muted">${file.modified}</small></td>
        <td>
        ${file.type === 'folder' ?
            `<button class="btn btn-sm btn-outline-primary open-btn" data-path="${file.path}">
            <i class="bi bi-folder2-open"></i>
            </button>` :
            `<button class="btn btn-sm btn-outline-primary download-btn" data-path="${file.path}">
            <i class="bi bi-download"></i>
            </button>`
        }
        </td>
        `;

        // 左键点击选择/取消选择
        row.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox' || e.target.classList.contains('file-checkbox')) {
                return;
            }

            if (e.target.tagName === 'BUTTON') {
                return;
            }

            toggleFileSelection(file.path);
        });

        // 右键菜单
        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            clearSelection();
            selectFile(file.path);
            showContextMenu(e, file);
        });

        // 文件夹打开按钮
        const openBtn = row.querySelector('.open-btn');
        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadFiles(file.path);
            });
        }

        // 文件下载按钮
        const downloadBtn = row.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(file);
            });
        }

        // 复选框事件
        const checkbox = row.querySelector('.file-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFileSelection(file.path, checkbox.checked);
        });

        return row;
    }

    // 文件选择功能
    function toggleFileSelection(filePath, checked = null) {
        const checkbox = document.querySelector(`.file-checkbox[data-path="${filePath}"]`);
        const row = document.querySelector(`.file-item[data-path="${filePath}"]`);

        if (checked === null) {
            checked = !selectedFiles.has(filePath);
        }

        if (checked) {
            selectedFiles.add(filePath);
            if (row) row.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            selectedFiles.delete(filePath);
            if (row) row.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }

        updateSelectAllCheckbox();
        updateDownloadButton();
    }

    function selectFile(filePath) {
        selectedFiles.add(filePath);
        const row = document.querySelector(`.file-item[data-path="${filePath}"]`);
        if (row) row.classList.add('selected');
        const checkbox = document.querySelector(`.file-checkbox[data-path="${filePath}"]`);
        if (checkbox) checkbox.checked = true;
        updateDownloadButton();
    }

    function clearSelection() {
        selectedFiles.forEach(path => {
            const row = document.querySelector(`.file-item[data-path="${path}"]`);
            if (row) row.classList.remove('selected');
            const checkbox = document.querySelector(`.file-checkbox[data-path="${path}"]`);
            if (checkbox) checkbox.checked = false;
        });
            selectedFiles.clear();
            updateDownloadButton();
    }

    function selectAllFiles() {
        clearSelection();
        currentFiles.forEach(file => {
            selectedFiles.add(file.path);
            const row = document.querySelector(`.file-item[data-path="${file.path}"]`);
            if (row) row.classList.add('selected');
            const checkbox = document.querySelector(`.file-checkbox[data-path="${file.path}"]`);
            if (checkbox) checkbox.checked = true;
        });
            updateDownloadButton();
    }

    function toggleSelectAll() {
        const checked = selectAllCheckbox.checked;

        if (checked) {
            selectAllFiles();
        } else {
            clearSelection();
        }
    }

    function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.file-checkbox');
        const allChecked = checkboxes.length > 0 &&
        Array.from(checkboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }

    function updateDownloadButton() {
        const hasSelectedFiles = selectedFiles.size > 0;
        downloadSelectedBtn.disabled = !hasSelectedFiles;

        if (hasSelectedFiles) {
            downloadSelectedBtn.innerHTML = `<i class="bi bi-download me-1"></i>下载(${selectedFiles.size})`;
        } else {
            downloadSelectedBtn.innerHTML = '<i class="bi bi-download me-1"></i>下载选中';
        }
    }

    // 下载功能
    function downloadFile(file) {
        if (file.type === 'folder') {
            loadFiles(file.path);
            return;
        }

        let downloadUrl = file.downloadUrl;

        if (!downloadUrl) {
            // 构建GitHub raw URL
            downloadUrl = `https://raw.githubusercontent.com/FY-Studio/fystudio.github.io/main/${file.path}`;
        }

        window.open(downloadUrl, '_blank');
        showToast(`开始下载: ${file.name}`);
    }

    async function downloadSelectedFiles() {
        if (selectedFiles.size === 0) {
            showToast('请先选择要下载的文件', 'warning');
            return;
        }

        for (const path of selectedFiles) {
            const file = allFiles.find(f => f.path === path);
            if (file && file.type !== 'folder') {
                downloadFile(file);
                // 稍微延迟，避免同时打开太多窗口
                await sleep(100);
            }
        }

        showToast(`已开始下载 ${selectedFiles.size} 个文件`);
    }

    // 右键菜单功能
    function setupContextMenu() {
        document.getElementById('menuDownload').addEventListener('click', () => {
            downloadSelectedFiles();
            hideContextMenu();
        });

        document.getElementById('menuCopyLink').addEventListener('click', () => {
            copySelectedLinks();
            hideContextMenu();
        });

        document.getElementById('menuDelete').addEventListener('click', () => {
            // 删除功能（需要服务器端支持）
            showToast('删除功能需要服务器端支持', 'info');
            hideContextMenu();
        });
    }

    function showContextMenu(event, file) {
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.display = 'block';
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
    }

    // 搜索功能
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();

        if (query === '') {
            currentFiles = allFiles;
            displayFiles(allFiles);
            return;
        }

        const filteredFiles = allFiles.filter(file =>
        file.name.toLowerCase().includes(query)
        );

        currentFiles = filteredFiles;
        displayFiles(filteredFiles);
    }

    // 返回上一级
    function goBack() {
        if (currentPath === '.') {
            showToast('已经在根目录', 'info');
            return;
        }

        const parentPath = getParentPath(currentPath);
        loadFiles(parentPath);
    }

    // 更新面包屑导航
    function updateBreadcrumb(path) {
        breadcrumb.innerHTML = '<li class="breadcrumb-item"><a href="#" data-path=".">根目录</a></li>';

        if (path === '.') return;

        const parts = path.split('/');
        let current = '';

        parts.forEach((part, index) => {
            if (part === '') return;

            current += (current ? '/' : '') + part;
            const isLast = index === parts.length - 1;

            const li = document.createElement('li');
            li.className = `breadcrumb-item ${isLast ? 'active' : ''}`;

            if (isLast) {
                li.textContent = part;
            } else {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = part;
                link.dataset.path = current;
                li.appendChild(link);

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadFiles(current);
                });
            }

            breadcrumb.appendChild(li);
        });
    }

    // 键盘快捷键
    function handleKeyDown(e) {
        // Ctrl+A: 全选
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            selectAllFiles();
        }

        // Ctrl+D: 取消全选
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            clearSelection();
        }

        // Backspace: 返回上一级
        if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            goBack();
        }

        // F5: 刷新
        if (e.key === 'F5') {
            e.preventDefault();
            loadFiles(currentPath);
        }
    }

    // 复制链接
    function copySelectedLinks() {
        if (selectedFiles.size === 0) {
            showToast('请先选择文件', 'warning');
            return;
        }

        const links = Array.from(selectedFiles).map(path => {
            const file = allFiles.find(f => f.path === path);
            if (!file) return '';

            if (file.type === 'folder') {
                return `https://github.com/FY-Studio/fystudio.github.io/tree/main/${file.path}`;
            } else {
                return `https://raw.githubusercontent.com/FY-Studio/fystudio.github.io/main/${file.path}`;
            }
        }).filter(link => link !== '');

        const text = links.join('\n');

        navigator.clipboard.writeText(text).then(() => {
            showToast(`已复制 ${links.length} 个链接到剪贴板`);
        }).catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'error');
        });
    }

    // 工具函数
    function getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    }

    function getFileIcon(file) {
        if (file.type === 'folder') {
            return fileIcons.folder;
        }

        const ext = getFileExtension(file.name);
        return fileIcons[ext] || fileIcons.default;
    }

    function getFileIconClass(file) {
        if (file.type === 'folder') {
            return fileTypeColors.folder;
        }

        const ext = getFileExtension(file.name);
        return fileTypeColors[ext] || fileTypeColors.default;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

    function formatDate(dateString) {
        if (!dateString) return '未知';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;

        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function getParentPath(path) {
        if (path === '.') return '.';

        const parts = path.split('/');
        parts.pop();

        return parts.length === 0 ? '.' : parts.join('/');
    }

    function showLoading() {
        loading.style.display = 'block';
        fileListContainer.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function hideLoading() {
        loading.style.display = 'none';
        fileListContainer.style.display = 'block';
    }

    function showEmptyState() {
        fileListContainer.style.display = 'none';
        emptyState.style.display = 'block';
    }

    function hideEmptyState() {
        emptyState.style.display = 'none';
    }

    function showToast(message, type = 'success') {
        // 移除旧的toast
        const oldToast = document.querySelector('.toast-notification');
        if (oldToast) oldToast.remove();

        const colors = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        };

        const toast = document.createElement('div');
        toast.className = `toast-notification position-fixed ${colors[type] || 'bg-success'} text-white`;
        toast.style.cssText = `
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1050;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.innerHTML = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);

        // 添加CSS动画
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            `;
            document.head.appendChild(style);
        }
    }

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

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
