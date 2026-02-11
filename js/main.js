/**
 * 主页交互脚本
 */

const API_BASE_MAIN = (typeof location !== 'undefined' && location.pathname.indexOf('/admin') !== -1) ? '../api' : 'api';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_BASE_MAIN}/status.php`);
        const data = await res.json();
        if (data.disabled) {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0f1a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:20px;box-sizing:border-box;"><div><h1 style="font-size:1.5rem;margin-bottom:12px;">站点已禁用</h1><p style="color:#a0aec0;">本站因安全原因已暂时关闭。</p></div></div>';
            return;
        }
    } catch (_) {}
    // 初始化主题（先应用，避免闪烁）
    initTheme();
    
    // 从服务器获取最新数据
    await dataManager.fetchData();
    
    // 初始化其他功能
    initNavigation();
    initScrollEffects();
    initAnimations();
    initContactForm();
    loadData();
    
    // 设置当前年份
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});

/**
 * 主题管理
 */
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const settings = dataManager.getSettings();
    
    // 根据设置确定初始主题
    if (settings.theme === 'auto') {
        applyAutoTheme();
        // 每分钟检查一次是否需要切换
        setInterval(applyAutoTheme, 60000);
    } else {
        setTheme(settings.theme);
    }
    
    // 主题切换按钮
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        
        // 更新设置为手动模式
        const settings = dataManager.getSettings();
        settings.theme = newTheme;
        dataManager.updateSettings(settings);
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // 添加过渡动画
    document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
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

/** 滚动节流（性能优化） */
function throttle(fn, delay) {
    let last = 0;
    return function (...args) {
        const now = Date.now();
        if (now - last >= delay) {
            last = now;
            fn.apply(this, args);
        }
    };
}

/**
 * 导航栏
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const backToTop = document.getElementById('backToTop');
    
    const onScroll = throttle(() => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
        updateActiveNavLink();
    }, 50);
    
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // 移动端菜单切换
    menuToggle.addEventListener('click', () => {
        const isOpen = !mobileMenu.classList.toggle('active');
        menuToggle.classList.toggle('active', !isOpen);
        menuToggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });
    
    // 点击导航链接时关闭移动端菜单
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    });
    
    // 回到顶部
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

/** 滚动动画观察器（单例，避免重复观察） */
let _scrollObserver = null;

function getScrollObserver() {
    if (_scrollObserver) return _scrollObserver;
    _scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(num => { animateNumber(num); });
                const skillBars = entry.target.querySelectorAll('.skill-progress');
                skillBars.forEach(bar => {
                    const progress = bar.getAttribute('data-progress');
                    setTimeout(() => { bar.style.width = progress + '%'; }, 200);
                });
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    return _scrollObserver;
}

/** 观察新加入的需动画元素（供 loadSkills/loadProjects 后调用） */
function observeScrollElements(container) {
    const observer = getScrollObserver();
    (container || document).querySelectorAll('.animate-on-scroll, .skill-card, .project-card').forEach(el => {
        observer.observe(el);
    });
}

/**
 * 滚动效果
 */
function initScrollEffects() {
    observeScrollElements(document);
}

function animateNumber(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const updateNumber = () => {
        current += step;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = target + '+';
        }
    };
    
    updateNumber();
}

/**
 * 初始化动画
 */
function initAnimations() {
    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 鼠标跟随效果（可选）
    // initMouseFollow();
}

/**
 * 联系表单
 */
function initContactForm() {
    const form = document.getElementById('contactForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // 禁用按钮防止重复提交
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>发送中...</span><i class="fas fa-spinner fa-spin"></i>';
        
        // 提交留言到后端
        const result = await dataManager.submitMessage({ name, email, message });
        
        if (result.success) {
            showToast(result.message || '消息发送成功！感谢您的留言', 'success');
            form.reset();
        } else {
            showToast(result.message || '发送失败，请稍后重试', 'error');
        }
        
        // 恢复按钮
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>发送消息</span><i class="fas fa-paper-plane"></i>';
    });
}

/**
 * 加载数据
 */
function loadData() {
    loadProfile();
    loadAbout();
    loadSkills();
    loadProjects();
    loadContact();
    loadSocial();
}

function loadProfile() {
    const profile = dataManager.getProfile();
    
    // 更新页面上的个人信息
    const heroName = document.getElementById('heroName');
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroAvatar = document.getElementById('heroAvatar');
    const navName = document.getElementById('navName');
    const footerName = document.getElementById('footerName');
    
    if (heroName) heroName.textContent = profile.name;
    if (heroTitle) heroTitle.textContent = profile.title;
    if (heroDesc) heroDesc.textContent = profile.description;
    if (heroAvatar) heroAvatar.src = profile.avatar;
    if (navName) navName.textContent = profile.siteName;
    if (footerName) footerName.textContent = profile.siteName;
    
    // 更新页面标题
    document.title = profile.siteName;
}

function loadAbout() {
    const about = dataManager.getAbout();
    const aboutText = document.getElementById('aboutText');
    
    if (aboutText && about.content) {
        aboutText.innerHTML = about.content.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }
    
    // 更新统计数字
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 3 && about.stats) {
        statNumbers[0].setAttribute('data-count', about.stats.projects);
        statNumbers[1].setAttribute('data-count', about.stats.experience);
        statNumbers[2].setAttribute('data-count', about.stats.clients);
    }
}

function loadSkills() {
    const skills = dataManager.getSkills();
    const container = document.getElementById('skillsGrid');
    
    if (!container) return;
    
    container.innerHTML = skills.map(skill => `
        <div class="skill-card glass animate-on-scroll">
            <div class="skill-icon">
                <i class="${escapeHtml(skill.icon)}"></i>
            </div>
            <h3 class="skill-name">${escapeHtml(skill.name)}</h3>
            <p class="skill-desc">${escapeHtml(skill.description)}</p>
            <div class="skill-bar">
                <div class="skill-progress" data-progress="${Number(skill.progress) || 0}"></div>
            </div>
        </div>
    `).join('');
    
    observeScrollElements(container);
}

function loadProjects() {
    const projects = dataManager.getProjects();
    const container = document.getElementById('projectsGrid');
    
    if (!container) return;
    
    container.innerHTML = projects.map(project => `
        <div class="project-card glass animate-on-scroll">
            <div class="project-image">
                <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy">
                <div class="project-overlay">
                    <a href="${escapeHtml(project.demoUrl || '#')}" class="project-link" title="查看演示" target="_blank" rel="noopener">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="${escapeHtml(project.codeUrl || '#')}" class="project-link" title="查看代码" target="_blank" rel="noopener">
                        <i class="fab fa-github"></i>
                    </a>
                </div>
            </div>
            <div class="project-info">
                <h3 class="project-title">${escapeHtml(project.title)}</h3>
                <p class="project-desc">${escapeHtml(project.description)}</p>
                <div class="project-tags">
                    ${(project.tags || []).map(tag => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    observeScrollElements(container);
}

function loadContact() {
    const contact = dataManager.getContact();
    const container = document.getElementById('contactMethods');
    
    if (!container) return;
    
    const methods = [
        { icon: 'fas fa-envelope', label: '邮箱', value: contact.email, href: `mailto:${contact.email}` },
        { icon: 'fas fa-phone', label: '电话', value: contact.phone, href: `tel:${contact.phone}` },
        { icon: 'fas fa-map-marker-alt', label: '位置', value: contact.location, href: '#' }
    ];
    
    container.innerHTML = methods.map(method => `
        <a href="${escapeHtml(method.href)}" class="contact-method">
            <i class="${escapeHtml(method.icon)}"></i>
            <div>
                <strong>${escapeHtml(method.label)}</strong>
                <p>${escapeHtml(method.value)}</p>
            </div>
        </a>
    `).join('');
}

function loadSocial() {
    const social = dataManager.getSocial();
    const container = document.getElementById('socialLinks');
    
    if (!container) return;
    
    container.innerHTML = social.map(link => `
        <a href="${escapeHtml(link.url)}" class="social-link" title="${escapeHtml(link.platform)}" target="_blank" rel="noopener">
            <i class="${escapeHtml(link.icon)}"></i>
        </a>
    `).join('');
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
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * 鼠标跟随效果（可选功能）
 */
function initMouseFollow() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.innerHTML = '<div class="cursor-inner"></div>';
    document.body.appendChild(cursor);
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // 添加对应的 CSS
    const style = document.createElement('style');
    style.textContent = `
        .custom-cursor {
            position: fixed;
            width: 40px;
            height: 40px;
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
        }
        .cursor-inner {
            width: 100%;
            height: 100%;
            background: var(--accent-gradient);
            border-radius: 50%;
            opacity: 0.3;
            filter: blur(10px);
        }
    `;
    document.head.appendChild(style);
}
