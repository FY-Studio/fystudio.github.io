/**
 * 数据管理模块
 * 前后端混合模式：敏感数据通过 API，普通数据本地缓存
 */

// API 基础路径（支持从根目录或 admin 子目录访问）
const API_BASE = (typeof location !== 'undefined' && location.pathname.indexOf('/admin') !== -1) ? '../api' : 'api';

/** 默认头像 URL（统一一处） */
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

/**
 * 转义 HTML，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 解析时间字符串 "HH:mm" 为分钟数
 * @param {string} timeStr
 * @returns {number}
 */
function parseTime(timeStr) {
    const parts = (timeStr || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// 本地存储键名
const STORAGE_KEYS = {
    siteData: 'personalPageData',
    token: 'personalPageToken',
    settings: 'personalPageSettings'
};

/**
 * API 请求封装
 */
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    // 获取存储的令牌
    getToken() {
        return localStorage.getItem(STORAGE_KEYS.token);
    }
    
    // 设置令牌
    setToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.token, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.token);
        }
    }
    
    // 发送请求
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/${endpoint}`;
        const token = this.getToken();
        
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            }
        };
        
        if (options.body) {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            // 处理未授权响应
            if (response.status === 401) {
                this.setToken(null);
                return { success: false, message: '会话已过期，请重新登录' };
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return { success: false, message: '网络请求失败' };
        }
    }
    
    // GET 请求
    get(endpoint) {
        return this.request(endpoint);
    }
    
    // POST 请求
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }
}

// 创建 API 客户端实例
const api = new ApiClient(API_BASE);

/**
 * 数据管理类
 */
class DataManager {
    constructor() {
        this.storageKey = STORAGE_KEYS.siteData;
        this.cache = null;
        this.init();
    }
    
    // 初始化
    async init() {
        // 尝试从本地缓存加载数据
        const cached = localStorage.getItem(this.storageKey);
        if (cached) {
            try {
                this.cache = JSON.parse(cached);
            } catch (e) {
                this.cache = null;
            }
        }
    }
    
    // ===== 认证相关（通过后端 API）=====
    
    // 登录
    async login(username, password) {
        const result = await api.post('auth.php?action=login', { username, password });
        if (result.success && result.data?.token) {
            api.setToken(result.data.token);
        }
        return result;
    }
    
    // 检查登录状态
    async checkSession() {
        const token = api.getToken();
        if (!token) {
            return { success: false };
        }
        return await api.get('auth.php?action=check');
    }
    
    // 是否已登录（同步检查本地令牌）
    isLoggedIn() {
        return !!api.getToken();
    }
    
    // 登出
    async logout() {
        await api.post('auth.php?action=logout', {});
        api.setToken(null);
    }
    
    // 修改账号密码
    async updateAuth(newUsername, newPassword, currentPassword) {
        return await api.post('auth.php?action=update', {
            newUsername,
            newPassword,
            currentPassword
        });
    }
    
    // 获取当前用户名
    getCurrentUsername() {
        // 从缓存的会话信息获取
        return this.sessionUsername || 'admin';
    }
    
    // 设置当前用户名（登录成功后调用）
    setCurrentUsername(username) {
        this.sessionUsername = username;
    }
    
    // ===== 数据操作（混合模式）=====
    
    // 从服务器获取数据
    async fetchData() {
        const result = await api.get('data.php?action=get');
        if (result.success && result.data) {
            this.cache = result.data;
            localStorage.setItem(this.storageKey, JSON.stringify(result.data));
        }
        return result;
    }
    
    // 获取所有数据
    getAll() {
        return this.cache || this.getDefaultData();
    }
    
    // 获取指定部分数据
    get(key) {
        const all = this.getAll();
        return all[key] || null;
    }
    
    // 保存指定部分数据到服务器
    async save(section, data) {
        // 更新本地缓存
        if (!this.cache) this.cache = this.getDefaultData();
        this.cache[section] = data;
        localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
        
        // 同步到服务器
        return await api.post('data.php?action=save', { section, data });
    }
    
    // 本地更新（不同步到服务器）
    updateLocal(key, value) {
        if (!this.cache) this.cache = this.getDefaultData();
        this.cache[key] = value;
        localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    }
    
    // ===== 快捷方法 =====
    
    getProfile() { return this.get('profile'); }
    async updateProfile(profile) { return await this.save('profile', profile); }
    
    getAbout() { return this.get('about'); }
    async updateAbout(about) { return await this.save('about', about); }
    
    getSkills() { return this.get('skills') || []; }
    async updateSkills(skills) { return await this.save('skills', skills); }
    
    async addSkill(skill) {
        const skills = this.getSkills();
        skill.id = Date.now();
        skills.push(skill);
        return await this.updateSkills(skills);
    }
    
    async deleteSkill(id) {
        const skills = this.getSkills().filter(s => s.id !== id);
        return await this.updateSkills(skills);
    }
    
    getProjects() { return this.get('projects') || []; }
    async updateProjects(projects) { return await this.save('projects', projects); }
    
    async addProject(project) {
        const projects = this.getProjects();
        project.id = Date.now();
        projects.push(project);
        return await this.updateProjects(projects);
    }
    
    async deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id !== id);
        return await this.updateProjects(projects);
    }
    
    getContact() { return this.get('contact'); }
    async updateContact(contact) { return await this.save('contact', contact); }
    
    getSocial() { return this.get('social') || []; }
    async updateSocial(social) { return await this.save('social', social); }
    
    async addSocialLink(link) {
        const social = this.getSocial();
        link.id = Date.now();
        social.push(link);
        return await this.updateSocial(social);
    }
    
    async deleteSocialLink(id) {
        const social = this.getSocial().filter(s => s.id !== id);
        return await this.updateSocial(social);
    }
    
    // ===== 留言管理（通过 API）=====
    
    getMessages() { return this.get('messages') || []; }
    
    async submitMessage(message) {
        return await api.post('message.php?action=submit', message);
    }
    
    async fetchMessages() {
        const result = await api.get('message.php?action=list');
        if (result.success && result.data) {
            this.updateLocal('messages', result.data.messages);
        }
        return result;
    }
    
    async markMessageRead(id) {
        return await api.post('message.php?action=read', { id });
    }
    
    async deleteMessage(id) {
        return await api.post('message.php?action=delete', { id });
    }
    
    // ===== 设置（本地存储）=====
    
    getSettings() {
        const settings = this.get('settings');
        return settings || {
            theme: 'auto',
            autoThemeLight: '06:00',
            autoThemeDark: '18:00',
            personalizedAd: true
        };
    }
    
    async updateSettings(settings) {
        return await this.save('settings', settings);
    }
    
    // ===== 数据导入导出 =====
    
    async exportData() {
        const result = await api.get('data.php?action=export');
        if (result.success && result.data) {
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `personal-page-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        return result;
    }
    
    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const result = await api.post('data.php?action=import', { data });
            if (result.success) {
                this.cache = data;
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
            return result;
        } catch (e) {
            return { success: false, message: '数据格式错误' };
        }
    }
    
    async resetAll() {
        const result = await api.post('data.php?action=reset', {});
        if (result.success) {
            this.cache = null;
            localStorage.removeItem(this.storageKey);
            await this.fetchData();
        }
        return result;
    }
    
    /**
     * 一键跑路：校验密码后由后端删除全站，仅保留「站长已跑路」页（不可逆）
     * @param {string} password 后台密码
     */
    async nukeSite(password) {
        return await api.post('nuke.php', { password });
    }
    
    // ===== 默认数据 =====
    
    getDefaultData() {
        return {
            profile: {
                name: '小狐狸',
                title: '全栈开发者 & 设计师',
                description: '热爱创造美好的数字体验，专注于现代化的网页设计与开发',
                avatar: DEFAULT_AVATAR,
                siteName: '我的主页'
            },
            about: {
                content: [
                    '我是一名热爱技术与设计的全栈开发者。',
                    '我相信好的设计是视觉与体验的完美结合。',
                    '期待与您一起创造精彩。'
                ],
                stats: { projects: 50, experience: 5, clients: 100 }
            },
            skills: [],
            projects: [],
            contact: { email: '', phone: '', location: '', wechat: '' },
            social: [],
            messages: [],
            settings: { theme: 'auto', autoThemeLight: '06:00', autoThemeDark: '18:00', personalizedAd: true }
        };
    }
}

// 导出数据管理器实例
const dataManager = new DataManager();

// 供 main.js / admin.js 使用的工具（避免重复定义）
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.parseTime = parseTime;
    window.DEFAULT_AVATAR = DEFAULT_AVATAR;
}
