<?php
/**
 * 配置文件
 * 存储敏感信息和系统配置
 */

// 开启错误报告（生产环境请关闭）
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 数据存储目录
define('DATA_DIR', __DIR__ . '/data/');

// 确保数据目录存在
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// 默认管理员账号（首次运行时使用）
define('DEFAULT_USERNAME', 'admin');
define('DEFAULT_PASSWORD', '123456');

// 会话配置
define('SESSION_LIFETIME', 3600); // 会话有效期：1小时

// 允许的来源（CORS）- 生产环境请设置具体域名
define('ALLOWED_ORIGIN', '*');

// API 响应头设置
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * 统一 JSON 响应
 */
function jsonResponse($success, $message = '', $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * 获取 POST JSON 数据
 */
function getPostData() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

/**
 * 读取 JSON 文件
 */
function readJsonFile($filename) {
    $filepath = DATA_DIR . $filename;
    if (file_exists($filepath)) {
        $content = file_get_contents($filepath);
        return json_decode($content, true);
    }
    return null;
}

/**
 * 写入 JSON 文件
 */
function writeJsonFile($filename, $data) {
    $filepath = DATA_DIR . $filename;
    return file_put_contents($filepath, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

/**
 * 密码哈希
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * 验证密码
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * 生成安全的会话令牌
 */
function generateToken() {
    return bin2hex(random_bytes(32));
}

/**
 * 初始化管理员账号（如果不存在）
 */
function initAuth() {
    $authFile = DATA_DIR . 'auth.json';
    if (!file_exists($authFile)) {
        $auth = [
            'username' => DEFAULT_USERNAME,
            'password' => hashPassword(DEFAULT_PASSWORD),
            'created_at' => date('Y-m-d H:i:s')
        ];
        writeJsonFile('auth.json', $auth);
    }
}

/**
 * 获取请求头（兼容 Nginx 等无 getallheaders 的环境）
 */
function getRequestHeaders() {
    if (function_exists('getallheaders')) {
        return getallheaders();
    }
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace('_', '-', substr($key, 5));
            $headers[$name] = $value;
        }
    }
    return $headers;
}

/**
 * 验证会话令牌
 */
function validateSession() {
    $headers = getRequestHeaders();
    $token = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($token)) {
        return false;
    }
    
    // 移除 "Bearer " 前缀
    $token = str_replace('Bearer ', '', $token);
    
    $sessions = readJsonFile('sessions.json') ?: [];
    
    if (isset($sessions[$token])) {
        $session = $sessions[$token];
        // 检查是否过期
        if (time() - $session['created_at'] < SESSION_LIFETIME) {
            return $session;
        } else {
            // 清除过期会话
            unset($sessions[$token]);
            writeJsonFile('sessions.json', $sessions);
        }
    }
    
    return false;
}

/**
 * 要求登录验证
 */
function requireAuth() {
    $session = validateSession();
    if (!$session) {
        http_response_code(401);
        jsonResponse(false, '未登录或会话已过期');
    }
    return $session;
}

// 初始化
initAuth();
