<?php
/**
 * 数据 API
 * 处理网站内容数据的读取和保存
 */

require_once 'config.php';

// 获取操作类型
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        handleGetData();
        break;
    case 'save':
        handleSaveData();
        break;
    case 'export':
        handleExportData();
        break;
    case 'import':
        handleImportData();
        break;
    case 'reset':
        handleResetData();
        break;
    default:
        jsonResponse(false, '无效的操作');
}

/**
 * 获取网站数据（公开接口）
 */
function handleGetData() {
    $data = readJsonFile('site_data.json');
    
    if (!$data) {
        // 返回默认数据
        $data = getDefaultData();
        writeJsonFile('site_data.json', $data);
    }
    
    jsonResponse(true, '获取成功', $data);
}

/**
 * 保存网站数据（需要登录）
 */
function handleSaveData() {
    requireAuth();
    
    $allowedSections = ['profile', 'about', 'skills', 'projects', 'contact', 'social', 'settings'];
    $postData = getPostData();
    $section = $postData['section'] ?? '';
    $data = $postData['data'] ?? null;
    
    if (empty($section) || $data === null) {
        jsonResponse(false, '参数错误');
    }
    
    if (!in_array($section, $allowedSections, true)) {
        jsonResponse(false, '不允许保存的模块');
    }
    
    // 读取现有数据
    $siteData = readJsonFile('site_data.json') ?: getDefaultData();
    
    // 更新指定部分
    $siteData[$section] = $data;
    $siteData['updated_at'] = date('Y-m-d H:i:s');
    
    writeJsonFile('site_data.json', $siteData);
    
    jsonResponse(true, '保存成功');
}

/**
 * 导出数据（需要登录）
 */
function handleExportData() {
    requireAuth();
    
    $data = readJsonFile('site_data.json') ?: getDefaultData();
    
    jsonResponse(true, '导出成功', $data);
}

/**
 * 导入数据（需要登录）
 */
function handleImportData() {
    requireAuth();
    
    $postData = getPostData();
    $importData = $postData['data'] ?? null;
    
    if (!$importData || !is_array($importData)) {
        jsonResponse(false, '导入数据格式错误');
    }
    
    $importData['updated_at'] = date('Y-m-d H:i:s');
    $importData['imported_at'] = date('Y-m-d H:i:s');
    
    writeJsonFile('site_data.json', $importData);
    
    jsonResponse(true, '导入成功');
}

/**
 * 重置数据（需要登录）
 */
function handleResetData() {
    requireAuth();
    
    $defaultData = getDefaultData();
    $defaultData['reset_at'] = date('Y-m-d H:i:s');
    
    writeJsonFile('site_data.json', $defaultData);
    
    jsonResponse(true, '数据已重置');
}

/**
 * 获取默认数据
 */
function getDefaultData() {
    return [
        'profile' => [
            'name' => '小狐狸',
            'title' => '全栈开发者 & 设计师',
            'description' => '热爱创造美好的数字体验，专注于现代化的网页设计与开发',
            'avatar' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            'siteName' => '我的主页'
        ],
        'about' => [
            'content' => [
                '我是一名热爱技术与设计的全栈开发者。在过去的几年里，我一直致力于创造既美观又实用的数字产品。',
                '我相信好的设计不仅仅是视觉上的美感，更是用户体验的完美结合。每一个项目，我都会倾注全部的热情和专业知识。',
                '当我不在写代码的时候，你可能会发现我在探索新技术、阅读技术博客，或者享受一杯咖啡的时光。'
            ],
            'stats' => [
                'projects' => 50,
                'experience' => 5,
                'clients' => 100
            ]
        ],
        'skills' => [
            ['id' => 1, 'name' => 'HTML / CSS', 'icon' => 'fab fa-html5', 'description' => '语义化 HTML5，响应式设计，CSS3 动画与布局', 'progress' => 95],
            ['id' => 2, 'name' => 'JavaScript', 'icon' => 'fab fa-js-square', 'description' => 'ES6+, TypeScript, 前端框架开发', 'progress' => 90],
            ['id' => 3, 'name' => 'React / Vue', 'icon' => 'fab fa-react', 'description' => '组件化开发, 状态管理, 单页应用', 'progress' => 88],
            ['id' => 4, 'name' => 'Node.js', 'icon' => 'fab fa-node-js', 'description' => 'Express, Koa, RESTful API 开发', 'progress' => 85],
            ['id' => 5, 'name' => 'Python', 'icon' => 'fab fa-python', 'description' => 'Django, Flask, 数据分析与自动化', 'progress' => 82],
            ['id' => 6, 'name' => 'UI/UX 设计', 'icon' => 'fas fa-palette', 'description' => 'Figma, 用户体验设计, 原型制作', 'progress' => 80]
        ],
        'projects' => [
            ['id' => 1, 'title' => '电商平台设计', 'description' => '一个现代化的电商网站，支持多种支付方式和响应式设计', 'image' => 'https://picsum.photos/seed/project1/600/400', 'tags' => ['React', 'Node.js', 'MongoDB'], 'demoUrl' => '#', 'codeUrl' => '#'],
            ['id' => 2, 'title' => '任务管理应用', 'description' => '简洁高效的任务管理工具，支持团队协作和实时同步', 'image' => 'https://picsum.photos/seed/project2/600/400', 'tags' => ['Vue.js', 'Firebase', 'Tailwind'], 'demoUrl' => '#', 'codeUrl' => '#'],
            ['id' => 3, 'title' => '社交媒体仪表盘', 'description' => '社交媒体数据分析平台，可视化展示各平台数据统计', 'image' => 'https://picsum.photos/seed/project3/600/400', 'tags' => ['Python', 'D3.js', 'PostgreSQL'], 'demoUrl' => '#', 'codeUrl' => '#']
        ],
        'contact' => [
            'email' => 'hello@example.com',
            'phone' => '+86 123 4567 8900',
            'location' => '中国，北京',
            'wechat' => 'my_wechat_id'
        ],
        'social' => [
            ['id' => 1, 'platform' => 'GitHub', 'icon' => 'fab fa-github', 'url' => 'https://github.com'],
            ['id' => 2, 'platform' => '微博', 'icon' => 'fab fa-weibo', 'url' => 'https://weibo.com'],
            ['id' => 3, 'platform' => 'LinkedIn', 'icon' => 'fab fa-linkedin-in', 'url' => 'https://linkedin.com'],
            ['id' => 4, 'platform' => 'Twitter', 'icon' => 'fab fa-twitter', 'url' => 'https://twitter.com']
        ],
        'messages' => [],
        'settings' => [
            'theme' => 'auto',
            'autoThemeLight' => '06:00',
            'autoThemeDark' => '18:00'
        ]
    ];
}
