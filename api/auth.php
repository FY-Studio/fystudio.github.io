<?php
/**
 * 认证 API
 * 处理登录、登出、修改密码等操作
 */

require_once 'config.php';

// 获取操作类型
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheckSession();
        break;
    case 'update':
        handleUpdateAuth();
        break;
    default:
        jsonResponse(false, '无效的操作');
}

/**
 * 处理登录
 */
function handleLogin() {
    $data = getPostData();
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        jsonResponse(false, '用户名和密码不能为空');
    }
    
    // 读取账号信息
    $auth = readJsonFile('auth.json');
    if (!$auth) {
        jsonResponse(false, '系统错误：无法读取账号信息');
    }
    
    // 验证账号密码
    if ($username !== $auth['username'] || !verifyPassword($password, $auth['password'])) {
        // 记录失败日志
        logLoginAttempt($username, false);
        jsonResponse(false, '用户名或密码错误');
    }
    
    // 生成会话令牌
    $token = generateToken();
    
    // 保存会话
    $sessions = readJsonFile('sessions.json') ?: [];
    $sessions[$token] = [
        'username' => $username,
        'created_at' => time(),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    writeJsonFile('sessions.json', $sessions);
    
    // 记录成功日志
    logLoginAttempt($username, true);
    
    jsonResponse(true, '登录成功', [
        'token' => $token,
        'username' => $username,
        'expires_in' => SESSION_LIFETIME
    ]);
}

/**
 * 处理登出
 */
function handleLogout() {
    $headers = getRequestHeaders();
    $token = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    
    if (!empty($token)) {
        $sessions = readJsonFile('sessions.json') ?: [];
        if (isset($sessions[$token])) {
            unset($sessions[$token]);
            writeJsonFile('sessions.json', $sessions);
        }
    }
    
    jsonResponse(true, '已登出');
}

/**
 * 检查会话状态
 */
function handleCheckSession() {
    $session = validateSession();
    if ($session) {
        jsonResponse(true, '会话有效', [
            'username' => $session['username']
        ]);
    } else {
        jsonResponse(false, '未登录或会话已过期');
    }
}

/**
 * 修改账号密码
 */
function handleUpdateAuth() {
    // 需要登录
    requireAuth();
    
    $data = getPostData();
    $newUsername = trim($data['newUsername'] ?? '');
    $newPassword = $data['newPassword'] ?? '';
    $currentPassword = $data['currentPassword'] ?? '';
    
    if (empty($currentPassword)) {
        jsonResponse(false, '请输入当前密码');
    }
    
    if (empty($newUsername) && empty($newPassword)) {
        jsonResponse(false, '请输入新用户名或新密码');
    }
    
    // 读取当前账号信息
    $auth = readJsonFile('auth.json');
    
    // 验证当前密码
    if (!verifyPassword($currentPassword, $auth['password'])) {
        jsonResponse(false, '当前密码错误');
    }
    
    // 更新账号信息
    if (!empty($newUsername)) {
        $auth['username'] = $newUsername;
    }
    if (!empty($newPassword)) {
        $auth['password'] = hashPassword($newPassword);
    }
    $auth['updated_at'] = date('Y-m-d H:i:s');
    
    writeJsonFile('auth.json', $auth);
    
    jsonResponse(true, '账号信息更新成功', [
        'username' => $auth['username']
    ]);
}

/**
 * 记录登录日志
 */
function logLoginAttempt($username, $success) {
    $logs = readJsonFile('login_logs.json') ?: [];
    
    // 只保留最近100条记录
    if (count($logs) >= 100) {
        array_shift($logs);
    }
    
    $logs[] = [
        'username' => $username,
        'success' => $success,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'time' => date('Y-m-d H:i:s')
    ];
    
    writeJsonFile('login_logs.json', $logs);
}
