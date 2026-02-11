/**
 * 后台管理脚本
 */

// 广告链接保护：正确 URL 在后端校验，前端只提交当前 href；密钥用于触发整站禁用
const AD_PROTECT_SECRET = (function (s) { try { return atob(s); } catch (e) { return ''; } })('YTdmM2IyYzlkMWU0ZjVhNmI3YzhkOWUwZjFhMmIzYzRkNWU2Zjc=');
const API_BASE_ADMIN = (typeof location !== 'undefined' && location.pathname.indexOf('/admin') !== -1) ? '../api' : 'api';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLogin();
    
    // 检查登录状态
    if (dataManager.isLoggedIn()) {
        // 验证会话是否有效
        const result = await dataManager.checkSession();
        if (result.success) {
            dataManager.setCurrentUsername(result.data?.username || 'admin');
            await showAdminPanel();
        }
    }
});

/**
 * 广告链接保护：后端校验当前广告 href 是否与正确 URL 一致，失败则触发整站禁用
 * @returns {Promise<boolean>} true 通过，false 已禁用整站并替换页面
 */
async function verifyAdLink() {
    const link = document.querySelector('#adminAd .admin-ad-link');
    if (!link) return true;
    const href = (link.getAttribute('href') || '').trim().replace(/\/+$/, '');

    let valid = false;
    try {
        const res = await fetch(`${API_BASE_ADMIN}/verify_ad.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ href: href })
        });
        const data = await res.json();
        valid = data.valid === true;
    } catch (_) {}

    if (valid) return true;

    try {
        await fetch(`${API_BASE_ADMIN}/disable.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: AD_PROTECT_SECRET })
        });
    } catch (_) {}
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f1a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:20px;box-sizing:border-box;"><div><h1 style="font-size:1.5rem;margin-bottom:12px;">站点已因安全原因禁用</h1><p style="color:#a0aec0;">检测到关键内容被篡改，整站已关闭。</p></div></div>';
    return false;
}

/**
 * 显示管理面板（登录成功后调用）
 */
async function showAdminPanel() {
    document.getElementById('loginOverlay').classList.add('hidden');
    if (!(await verifyAdLink())) return;

    // 从服务器获取最新数据
    await dataManager.fetchData();
    
    initNavigation();
    initForms();
    loadAllData();
    initModal();
    initSettings();
    initAdminAd();
    await updateUnreadBadge();
    initLogout();
}

/**
 * 雨云广告条：关闭后仅当次隐藏，刷新会再出现；系统设置中可关闭「个性化广告」则永不显示
 */
function initAdminAd() {
    const adEl = document.getElementById('adminAd');
    const closeBtn = document.getElementById('adminAdClose');
    if (!adEl || !closeBtn) return;

    const settings = dataManager.getSettings();
    if (settings.personalizedAd === false) {
        adEl.classList.add('hidden');
        return;
    }

    adEl.classList.remove('hidden');
    closeBtn.addEventListener('click', () => {
        adEl.classList.add('hidden');
    });
}

/**
 * 登录功能
 */
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    
    // 切换密码可见性
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
    
    // 登录表单提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        // 禁用按钮防止重复提交
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>登录中...</span>';
        
        const result = await dataManager.login(username, password);
        
        if (result.success) {
            loginError.classList.remove('show');
            dataManager.setCurrentUsername(result.data?.username || username);
            await showAdminPanel();
            showToast('登录成功，欢迎回来！', 'success');
        } else {
            loginError.textContent = result.message || '用户名或密码错误，请重试';
            loginError.classList.add('show');
            // 清空密码框
            passwordInput.value = '';
            passwordInput.focus();
        }
        
        // 恢复按钮
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>登 录</span>';
    });
}

/**
 * 登出功能
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn.addEventListener('click', async () => {
        if (confirm('确定要退出登录吗？')) {
            await dataManager.logout();
            // 刷新页面回到登录状态
            window.location.reload();
        }
    });
}

/**
 * 主题管理
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const settings = dataManager.getSettings();
    
    // 设置初始主题
    if (settings.theme === 'auto') {
        applyAutoTheme();
    } else {
        setTheme(settings.theme);
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function applyAutoTheme() {
    const settings = dataManager.getSettings();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const lightTime = parseTime(settings.autoThemeLight || '06:00');
    const darkTime = parseTime(settings.autoThemeDark || '18:00');
    
    const theme = (currentTime >= lightTime && currentTime < darkTime) ? 'light' : 'dark';
    setTheme(theme);
}

/**
 * 导航管理
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    // 导航切换
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            
            // 更新导航状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // 更新区域显示
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`section-${sectionId}`).classList.add('active');
            
            // 更新页面标题
            pageTitle.textContent = item.querySelector('span').textContent;
            
            // 移动端关闭菜单
            sidebar.classList.remove('active');
        });
    });
    
    // 移动端菜单切换
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // 点击外部关闭移动端菜单
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

/**
 * 表单初始化
 */
function initForms() {
    // 个人信息表单
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('profileAvatar').addEventListener('input', updateAvatarPreview);
    
    // 关于我表单
    document.getElementById('aboutForm').addEventListener('submit', saveAbout);
    document.getElementById('addParagraph').addEventListener('click', addParagraph);
    
    // 联系方式表单
    document.getElementById('contactForm').addEventListener('submit', saveContact);
    
    // 添加按钮
    document.getElementById('addSkillBtn').addEventListener('click', () => openSkillModal());
    document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal());
    document.getElementById('addSocialBtn').addEventListener('click', () => openSocialModal());
}

/**
 * 加载所有数据
 */
function loadAllData() {
    loadProfile();
    loadAbout();
    loadSkills();
    loadProjects();
    loadContact();
    loadSocial();
    loadMessages();
    loadSettings();
}

/**
 * 个人信息
 */
function loadProfile() {
    const profile = dataManager.getProfile();
    
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileTitle').value = profile.title || '';
    document.getElementById('profileDesc').value = profile.description || '';
    document.getElementById('profileAvatar').value = profile.avatar || '';
    document.getElementById('profileSiteName').value = profile.siteName || '';
    
    updateAvatarPreview();
    
    // 更新管理员显示（显示登录用户名）
    document.getElementById('adminName').textContent = dataManager.getCurrentUsername() || '管理员';
    document.getElementById('adminAvatar').src = profile.avatar || (typeof DEFAULT_AVATAR !== 'undefined' ? DEFAULT_AVATAR : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');
}

function updateAvatarPreview() {
    const avatar = document.getElementById('profileAvatar').value;
    const preview = document.getElementById('avatarPreview');
    preview.src = avatar || (typeof DEFAULT_AVATAR !== 'undefined' ? DEFAULT_AVATAR : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');
}

async function saveProfile(e) {
    e.preventDefault();
    
    const profile = {
        name: document.getElementById('profileName').value,
        title: document.getElementById('profileTitle').value,
        description: document.getElementById('profileDesc').value,
        avatar: document.getElementById('profileAvatar').value,
        siteName: document.getElementById('profileSiteName').value
    };
    
    const result = await dataManager.updateProfile(profile);
    if (result.success) {
        showToast('个人信息保存成功', 'success');
    } else {
        showToast(result.message || '保存失败', 'error');
    }
    
    // 更新管理员显示
    document.getElementById('adminName').textContent = dataManager.getCurrentUsername() || '管理员';
    document.getElementById('adminAvatar').src = profile.avatar || (typeof DEFAULT_AVATAR !== 'undefined' ? DEFAULT_AVATAR : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');
}

/**
 * 关于我
 */
function loadAbout() {
    const about = dataManager.getAbout();
    
    // 加载段落
    const container = document.getElementById('aboutParagraphs');
    container.innerHTML = '';
    
    if (about.content && about.content.length > 0) {
        about.content.forEach((text, index) => {
            addParagraphElement(text, index);
        });
    } else {
        addParagraphElement('', 0);
    }
    
    // 加载统计
    if (about.stats) {
        document.getElementById('statProjects').value = about.stats.projects || 0;
        document.getElementById('statExperience').value = about.stats.experience || 0;
        document.getElementById('statClients').value = about.stats.clients || 0;
    }
}

function addParagraph() {
    const container = document.getElementById('aboutParagraphs');
    const index = container.children.length;
    addParagraphElement('', index);
}

function addParagraphElement(text, index) {
    const container = document.getElementById('aboutParagraphs');
    const div = document.createElement('div');
    div.className = 'paragraph-item';
    div.innerHTML = `
        <textarea class="paragraph-text" rows="3" placeholder="输入段落内容...">${text}</textarea>
        <button type="button" class="btn btn-remove" onclick="removeParagraph(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeParagraph(btn) {
    const container = document.getElementById('aboutParagraphs');
    if (container.children.length > 1) {
        btn.parentElement.remove();
    } else {
        showToast('至少保留一个段落', 'error');
    }
}

async function saveAbout(e) {
    e.preventDefault();
    
    const paragraphs = document.querySelectorAll('.paragraph-text');
    const content = Array.from(paragraphs).map(p => p.value).filter(t => t.trim());
    
    const about = {
        content: content,
        stats: {
            projects: parseInt(document.getElementById('statProjects').value) || 0,
            experience: parseInt(document.getElementById('statExperience').value) || 0,
            clients: parseInt(document.getElementById('statClients').value) || 0
        }
    };
    
    const result = await dataManager.updateAbout(about);
    if (result.success) {
        showToast('关于我信息保存成功', 'success');
    } else {
        showToast(result.message || '保存失败', 'error');
    }
}

/**
 * 技能管理
 */
function loadSkills() {
    const skills = dataManager.getSkills();
    const container = document.getElementById('skillsList');
    
    if (skills.length === 0) {
        container.innerHTML = '<p class="empty-hint" style="text-align:center;color:var(--text-muted);padding:20px;">暂无技能，点击上方按钮添加</p>';
        return;
    }
    
    container.innerHTML = skills.map(skill => `
        <div class="list-item">
            <div class="list-item-icon">
                <i class="${escapeHtml(skill.icon)}"></i>
            </div>
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(skill.name)}</div>
                <div class="list-item-desc">${escapeHtml(skill.description)}</div>
                <div class="progress-preview">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Number(skill.progress) || 0}%"></div>
                    </div>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-edit" onclick="openSkillModal(${Number(skill.id)})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="deleteSkill(${Number(skill.id)})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openSkillModal(id = null) {
    const skill = id ? dataManager.getSkills().find(s => s.id === id) : null;
    const name = escapeHtml(skill?.name || '');
    const icon = escapeHtml(skill?.icon || 'fas fa-code');
    const desc = escapeHtml(skill?.description || '');
    const progress = Number(skill?.progress) || 80;
    
    openModal(skill ? '编辑技能' : '添加技能', `
        <form id="skillModalForm">
            <input type="hidden" id="skillId" value="${id || ''}">
            <div class="form-group">
                <label for="skillName">技能名称</label>
                <input type="text" id="skillName" value="${name}" placeholder="例如：JavaScript" required>
            </div>
            <div class="form-group">
                <label for="skillIcon">图标类名</label>
                <input type="text" id="skillIcon" value="${icon}" placeholder="Font Awesome 类名">
                <small style="color:var(--text-muted);font-size:0.85rem;">使用 Font Awesome 图标，如 fab fa-react</small>
            </div>
            <div class="form-group">
                <label for="skillDesc">技能描述</label>
                <textarea id="skillDesc" rows="2" placeholder="简短描述这项技能">${desc}</textarea>
            </div>
            <div class="form-group">
                <label for="skillProgress">熟练度 (0-100): <span id="progressValue">${progress}</span>%</label>
                <input type="range" id="skillProgress" min="0" max="100" value="${progress}" 
                    oninput="document.getElementById('progressValue').textContent = this.value">
                <div class="progress-preview">
                    <div class="progress-bar">
                        <div class="progress-fill" id="previewFill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
    
    // 进度条预览
    document.getElementById('skillProgress').addEventListener('input', (e) => {
        document.getElementById('previewFill').style.width = e.target.value + '%';
    });
    
    // 表单提交
    document.getElementById('skillModalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSkill();
    });
}

async function saveSkill() {
    const id = document.getElementById('skillId').value;
    const skill = {
        name: document.getElementById('skillName').value,
        icon: document.getElementById('skillIcon').value,
        description: document.getElementById('skillDesc').value,
        progress: parseInt(document.getElementById('skillProgress').value)
    };
    
    let result;
    if (id) {
        // 编辑
        const skills = dataManager.getSkills();
        const index = skills.findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            skill.id = parseInt(id);
            skills[index] = skill;
            result = await dataManager.updateSkills(skills);
        }
    } else {
        // 添加
        result = await dataManager.addSkill(skill);
    }
    
    closeModal();
    loadSkills();
    if (result?.success) {
        showToast('技能保存成功', 'success');
    } else {
        showToast(result?.message || '保存失败', 'error');
    }
}

async function deleteSkill(id) {
    if (confirm('确定要删除这项技能吗？')) {
        await dataManager.deleteSkill(id);
        loadSkills();
        showToast('技能已删除', 'success');
    }
}

/**
 * 项目管理
 */
function loadProjects() {
    const projects = dataManager.getProjects();
    const container = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        container.innerHTML = '<p class="empty-hint" style="text-align:center;color:var(--text-muted);padding:20px;">暂无项目，点击上方按钮添加</p>';
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="list-item">
            <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" class="list-item-image">
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(project.title)}</div>
                <div class="list-item-desc">${escapeHtml(project.description)}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-edit" onclick="openProjectModal(${Number(project.id)})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="deleteProject(${Number(project.id)})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openProjectModal(id = null) {
    const project = id ? dataManager.getProjects().find(p => p.id === id) : null;
    const tags = (project?.tags || []).join(', ');
    const title = escapeHtml(project?.title || '');
    const description = escapeHtml(project?.description || '');
    const image = escapeHtml(project?.image || '');
    const demoUrl = escapeHtml(project?.demoUrl || '');
    const codeUrl = escapeHtml(project?.codeUrl || '');
    
    openModal(project ? '编辑项目' : '添加项目', `
        <form id="projectModalForm">
            <input type="hidden" id="projectId" value="${id || ''}">
            <div class="form-group">
                <label for="projectTitle">项目名称</label>
                <input type="text" id="projectTitle" value="${title}" placeholder="项目名称" required>
            </div>
            <div class="form-group">
                <label for="projectDesc">项目描述</label>
                <textarea id="projectDesc" rows="2" placeholder="简要描述项目">${description}</textarea>
            </div>
            <div class="form-group">
                <label for="projectImage">封面图片 URL</label>
                <input type="url" id="projectImage" value="${image}" placeholder="https://example.com/image.jpg">
            </div>
            <div class="form-group">
                <label for="projectTags">技术标签（逗号分隔）</label>
                <input type="text" id="projectTags" value="${escapeHtml(tags)}" placeholder="React, Node.js, MongoDB">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="projectDemo">演示链接</label>
                    <input type="url" id="projectDemo" value="${demoUrl}" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label for="projectCode">代码链接</label>
                    <input type="url" id="projectCode" value="${codeUrl}" placeholder="https://github.com/...">
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
    
    document.getElementById('projectModalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });
}

async function saveProject() {
    const id = document.getElementById('projectId').value;
    const tagsStr = document.getElementById('projectTags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    
    const project = {
        title: document.getElementById('projectTitle').value,
        description: document.getElementById('projectDesc').value,
        image: document.getElementById('projectImage').value || 'https://picsum.photos/seed/default/600/400',
        tags: tags,
        demoUrl: document.getElementById('projectDemo').value || '#',
        codeUrl: document.getElementById('projectCode').value || '#'
    };
    
    let result;
    if (id) {
        const projects = dataManager.getProjects();
        const index = projects.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            project.id = parseInt(id);
            projects[index] = project;
            result = await dataManager.updateProjects(projects);
        }
    } else {
        result = await dataManager.addProject(project);
    }
    
    closeModal();
    loadProjects();
    if (result?.success) {
        showToast('项目保存成功', 'success');
    } else {
        showToast(result?.message || '保存失败', 'error');
    }
}

async function deleteProject(id) {
    if (confirm('确定要删除这个项目吗？')) {
        await dataManager.deleteProject(id);
        loadProjects();
        showToast('项目已删除', 'success');
    }
}

/**
 * 联系方式
 */
function loadContact() {
    const contact = dataManager.getContact();
    
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactLocation').value = contact.location || '';
    document.getElementById('contactWechat').value = contact.wechat || '';
}

async function saveContact(e) {
    e.preventDefault();
    
    const contact = {
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        location: document.getElementById('contactLocation').value,
        wechat: document.getElementById('contactWechat').value
    };
    
    const result = await dataManager.updateContact(contact);
    if (result.success) {
        showToast('联系方式保存成功', 'success');
    } else {
        showToast(result.message || '保存失败', 'error');
    }
}

/**
 * 社交链接
 */
function loadSocial() {
    const social = dataManager.getSocial();
    const container = document.getElementById('socialList');
    
    if (social.length === 0) {
        container.innerHTML = '<p class="empty-hint" style="text-align:center;color:var(--text-muted);padding:20px;">暂无社交链接，点击上方按钮添加</p>';
        return;
    }
    
    container.innerHTML = social.map(link => `
        <div class="list-item">
            <div class="list-item-icon">
                <i class="${escapeHtml(link.icon)}"></i>
            </div>
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(link.platform)}</div>
                <div class="list-item-desc">${escapeHtml(link.url)}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-edit" onclick="openSocialModal(${Number(link.id)})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="deleteSocial(${Number(link.id)})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openSocialModal(id = null) {
    const link = id ? dataManager.getSocial().find(s => s.id === id) : null;
    const platform = escapeHtml(link?.platform || '');
    const icon = escapeHtml(link?.icon || 'fab fa-link');
    const url = escapeHtml(link?.url || '');
    
    openModal(link ? '编辑链接' : '添加社交链接', `
        <form id="socialModalForm">
            <input type="hidden" id="socialId" value="${id || ''}">
            <div class="form-group">
                <label for="socialPlatform">平台名称</label>
                <input type="text" id="socialPlatform" value="${platform}" placeholder="例如：GitHub" required>
            </div>
            <div class="form-group">
                <label for="socialIcon">图标类名</label>
                <input type="text" id="socialIcon" value="${icon}" placeholder="Font Awesome 类名">
            </div>
            <div class="form-group">
                <label for="socialUrl">链接地址</label>
                <input type="url" id="socialUrl" value="${url}" placeholder="https://..." required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
    
    document.getElementById('socialModalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSocial();
    });
}

async function saveSocial() {
    const id = document.getElementById('socialId').value;
    const link = {
        platform: document.getElementById('socialPlatform').value,
        icon: document.getElementById('socialIcon').value,
        url: document.getElementById('socialUrl').value
    };
    
    let result;
    if (id) {
        const social = dataManager.getSocial();
        const index = social.findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            link.id = parseInt(id);
            social[index] = link;
            result = await dataManager.updateSocial(social);
        }
    } else {
        result = await dataManager.addSocialLink(link);
    }
    
    closeModal();
    loadSocial();
    if (result?.success) {
        showToast('社交链接保存成功', 'success');
    } else {
        showToast(result?.message || '保存失败', 'error');
    }
}

async function deleteSocial(id) {
    if (confirm('确定要删除这个链接吗？')) {
        await dataManager.deleteSocialLink(id);
        loadSocial();
        showToast('链接已删除', 'success');
    }
}

/**
 * 留言管理
 */
async function loadMessages() {
    await dataManager.fetchMessages();
    const messages = dataManager.getMessages();
    const container = document.getElementById('messagesList');
    const emptyState = document.getElementById('emptyMessages');
    const countEl = document.getElementById('messageCount');
    
    countEl.textContent = `共 ${messages.length} 条留言`;
    
    if (messages.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = messages.map(msg => `
        <div class="message-item ${msg.read ? '' : 'unread'}">
            <div class="message-header">
                <div class="message-sender">
                    <strong>${escapeHtml(msg.name)}</strong>
                    <span>${escapeHtml(msg.email)}</span>
                </div>
                <span class="message-date">${escapeHtml(formatDate(msg.date))}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.message)}</div>
            <div class="message-actions">
                ${!msg.read ? `<button class="btn btn-secondary btn-small" onclick="markRead(${Number(msg.id)})">
                    <i class="fas fa-check"></i> 标记已读
                </button>` : ''}
                <button class="btn btn-secondary btn-small btn-reply" data-email="${escapeHtml(msg.email)}" type="button">
                    <i class="fas fa-reply"></i> 回复
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteMessage(${Number(msg.id)})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `).join('');
    
    // 回复按钮事件委托（避免 XSS，使用 data-email）
    container.querySelectorAll('.btn-reply').forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.getAttribute('data-email') || '';
            if (email) window.open('mailto:' + email, '_blank');
        });
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function markRead(id) {
    await dataManager.markMessageRead(id);
    await loadMessages();
    await updateUnreadBadge();
}

function replyMessage(email) {
    if (email) window.open('mailto:' + email, '_blank');
}

async function deleteMessage(id) {
    if (confirm('确定要删除这条留言吗？')) {
        await dataManager.deleteMessage(id);
        await loadMessages();
        await updateUnreadBadge();
        showToast('留言已删除', 'success');
    }
}

async function updateUnreadBadge() {
    const result = await dataManager.fetchMessages();
    const messages = result.data?.messages || dataManager.getMessages();
    const unread = messages.filter(m => !m.read).length;
    const badge = document.getElementById('unreadBadge');
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'block' : 'none';
}

/**
 * 系统设置
 */
function initSettings() {
    const form = document.getElementById('settingsForm');
    const themeRadios = document.querySelectorAll('input[name="themeMode"]');
    const autoTimes = document.getElementById('autoThemeTimes');
    
    // 主题模式切换显示时间设置
    themeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'auto') {
                autoTimes.classList.remove('hidden');
            } else {
                autoTimes.classList.add('hidden');
            }
        });
    });
    
    // 导出数据
    document.getElementById('exportData').addEventListener('click', async () => {
        const result = await dataManager.exportData();
        if (result?.success) {
            showToast('数据导出成功', 'success');
        } else {
            showToast(result?.message || '导出失败', 'error');
        }
    });
    
    // 导入数据
    document.getElementById('importData').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = await dataManager.importData(event.target.result);
                if (result.success) {
                    showToast('数据导入成功', 'success');
                    loadAllData();
                } else {
                    showToast(result.message || '数据导入失败', 'error');
                }
            };
            reader.readAsText(file);
        }
    });
    
    // 重置数据
    document.getElementById('resetData').addEventListener('click', async () => {
        if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
            const result = await dataManager.resetAll();
            if (result.success) {
                showToast('数据已重置', 'success');
                loadAllData();
            } else {
                showToast(result.message || '重置失败', 'error');
            }
        }
    });
    
    // 一键跑路
    document.getElementById('nukeSiteBtn').addEventListener('click', () => {
        openModal('一键跑路 - 二次确认', `
            <div class="nuke-warning">
                <p class="nuke-warning-text"><i class="fas fa-exclamation-triangle"></i> 此操作将<strong>永久删除</strong>全站文件（后台、API、数据、样式、脚本等），仅保留一个「站长已跑路」的首页。</p>
                <p class="nuke-warning-text">操作<strong>不可恢复</strong>，请务必确认已导出数据备份。</p>
                <p class="nuke-warning-text">请输入<strong>后台登录密码</strong>以确认执行：</p>
                <div class="form-group">
                    <label for="nukePassword">后台密码</label>
                    <input type="password" id="nukePassword" placeholder="输入登录密码" autocomplete="current-password">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-danger" id="nukeConfirmBtn">
                        <i class="fas fa-running"></i> 确认跑路
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
                </div>
            </div>
        `);
        const confirmBtn = document.getElementById('nukeConfirmBtn');
        const passwordInput = document.getElementById('nukePassword');
        passwordInput.focus();
        const doNuke = async () => {
            const pwd = passwordInput.value.trim();
            if (!pwd) {
                showToast('请输入后台密码', 'error');
                return;
            }
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 执行中...';
            const result = await dataManager.nukeSite(pwd);
            if (result.success) {
                closeModal();
                showToast(result.message || '站点已关闭', 'success');
                setTimeout(() => {
                    window.location.href = (window.location.pathname.indexOf('/admin') !== -1 ? '../' : '/') + 'index.html';
                }, 1500);
            } else {
                showToast(result.message || '执行失败', 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-running"></i> 确认跑路';
            }
        };
        confirmBtn.addEventListener('click', doNuke);
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doNuke();
        });
    });
    
    // 修改账号密码
    document.getElementById('updateAuthBtn').addEventListener('click', async () => {
        const newUsername = document.getElementById('newUsername').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const currentPassword = document.getElementById('currentPassword').value;
        
        if (!currentPassword) {
            showToast('请输入当前密码', 'error');
            return;
        }
        
        if (!newUsername && !newPassword) {
            showToast('请输入新用户名或新密码', 'error');
            return;
        }
        
        const result = await dataManager.updateAuth(newUsername, newPassword, currentPassword);
        
        if (result.success) {
            showToast(result.message || '账号信息更新成功', 'success');
            // 清空表单
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('currentPassword').value = '';
            
            // 如果修改了用户名，更新顶部显示
            if (newUsername) {
                dataManager.setCurrentUsername(newUsername);
                document.getElementById('adminName').textContent = newUsername;
            }
        } else {
            showToast(result.message || '更新失败', 'error');
        }
    });
    
    // 保存设置
    form.addEventListener('submit', saveSettings);
}

function loadSettings() {
    const settings = dataManager.getSettings();
    
    // 设置主题模式
    const themeRadio = document.querySelector(`input[name="themeMode"][value="${settings.theme}"]`);
    if (themeRadio) {
        themeRadio.checked = true;
    }
    
    // 显示/隐藏时间设置
    const autoTimes = document.getElementById('autoThemeTimes');
    if (settings.theme === 'auto') {
        autoTimes.classList.remove('hidden');
    } else {
        autoTimes.classList.add('hidden');
    }
    
    // 设置时间
    document.getElementById('autoThemeLight').value = settings.autoThemeLight || '06:00';
    document.getElementById('autoThemeDark').value = settings.autoThemeDark || '18:00';
    
    // 个性化广告：勾选表示「关闭个性化广告」
    const closePersonalizedAd = document.getElementById('closePersonalizedAd');
    if (closePersonalizedAd) {
        closePersonalizedAd.checked = settings.personalizedAd === false;
    }
    
    // 设置当前用户名占位符
    const currentUsername = dataManager.getCurrentUsername();
    document.getElementById('newUsername').placeholder = `当前: ${currentUsername}（留空则不修改）`;
}

async function saveSettings(e) {
    e.preventDefault();
    
    const themeMode = document.querySelector('input[name="themeMode"]:checked').value;
    const closePersonalizedAd = document.getElementById('closePersonalizedAd');
    const personalizedAd = closePersonalizedAd ? !closePersonalizedAd.checked : true;
    
    const settings = {
        theme: themeMode,
        autoThemeLight: document.getElementById('autoThemeLight').value,
        autoThemeDark: document.getElementById('autoThemeDark').value,
        personalizedAd: personalizedAd
    };
    
    const result = await dataManager.updateSettings(settings);
    
    if (result && !result.success) {
        showToast(result.message || '保存失败', 'error');
        return;
    }
    
    if (themeMode === 'auto') {
        applyAutoTheme();
    } else {
        setTheme(themeMode);
    }
    
    // 关闭个性化广告时立即隐藏广告条
    const adEl = document.getElementById('adminAd');
    if (adEl) {
        if (personalizedAd) {
            adEl.classList.remove('hidden');
        } else {
            adEl.classList.add('hidden');
        }
    }
    
    showToast('设置保存成功', 'success');
}

/**
 * 模态框
 */
function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // ESC 关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

/**
 * Toast 消息
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// 全局函数（供 HTML 调用）
window.removeParagraph = removeParagraph;
window.openSkillModal = openSkillModal;
window.deleteSkill = deleteSkill;
window.openProjectModal = openProjectModal;
window.deleteProject = deleteProject;
window.openSocialModal = openSocialModal;
window.deleteSocial = deleteSocial;
window.markRead = markRead;
window.replyMessage = replyMessage;
window.deleteMessage = deleteMessage;
window.closeModal = closeModal;
