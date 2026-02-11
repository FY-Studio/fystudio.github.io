<?php
/**
 * 留言 API
 * 处理访客留言的提交和管理
 */

require_once 'config.php';

// 获取操作类型
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'submit':
        handleSubmitMessage();
        break;
    case 'list':
        handleListMessages();
        break;
    case 'read':
        handleMarkRead();
        break;
    case 'delete':
        handleDeleteMessage();
        break;
    default:
        jsonResponse(false, '无效的操作');
}

/**
 * 提交留言（公开接口）
 */
function handleSubmitMessage() {
    $data = getPostData();
    
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $message = trim($data['message'] ?? '');
    
    // 验证
    if (empty($name) || empty($email) || empty($message)) {
        jsonResponse(false, '请填写完整信息');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, '邮箱格式不正确');
    }
    
    if (mb_strlen($message) > 1000) {
        jsonResponse(false, '留言内容不能超过1000字');
    }
    
    // 简单的防刷检测
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (checkRateLimit($ip)) {
        jsonResponse(false, '操作过于频繁，请稍后再试');
    }
    
    // 读取现有留言
    $siteData = readJsonFile('site_data.json') ?: [];
    $messages = $siteData['messages'] ?? [];
    
    // 添加新留言
    $newMessage = [
        'id' => time() . rand(100, 999),
        'name' => htmlspecialchars($name),
        'email' => htmlspecialchars($email),
        'message' => htmlspecialchars($message),
        'ip' => $ip,
        'read' => false,
        'date' => date('c')
    ];
    
    array_unshift($messages, $newMessage);
    
    // 只保留最近200条留言
    $messages = array_slice($messages, 0, 200);
    
    $siteData['messages'] = $messages;
    writeJsonFile('site_data.json', $siteData);
    
    jsonResponse(true, '留言提交成功，感谢您的反馈！');
}

/**
 * 获取留言列表（需要登录）
 */
function handleListMessages() {
    requireAuth();
    
    $siteData = readJsonFile('site_data.json') ?: [];
    $messages = $siteData['messages'] ?? [];
    
    // 统计未读数量
    $unreadCount = count(array_filter($messages, function($m) {
        return !$m['read'];
    }));
    
    jsonResponse(true, '获取成功', [
        'messages' => $messages,
        'total' => count($messages),
        'unread' => $unreadCount
    ]);
}

/**
 * 标记留言为已读（需要登录）
 */
function handleMarkRead() {
    requireAuth();
    
    $data = getPostData();
    $messageId = $data['id'] ?? '';
    
    if (empty($messageId)) {
        jsonResponse(false, '参数错误');
    }
    
    $siteData = readJsonFile('site_data.json') ?: [];
    $messages = $siteData['messages'] ?? [];
    
    $found = false;
    foreach ($messages as &$msg) {
        if ($msg['id'] == $messageId) {
            $msg['read'] = true;
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        jsonResponse(false, '留言不存在');
    }
    
    $siteData['messages'] = $messages;
    writeJsonFile('site_data.json', $siteData);
    
    jsonResponse(true, '已标记为已读');
}

/**
 * 删除留言（需要登录）
 */
function handleDeleteMessage() {
    requireAuth();
    
    $data = getPostData();
    $messageId = $data['id'] ?? '';
    
    if (empty($messageId)) {
        jsonResponse(false, '参数错误');
    }
    
    $siteData = readJsonFile('site_data.json') ?: [];
    $messages = $siteData['messages'] ?? [];
    
    $originalCount = count($messages);
    $messages = array_filter($messages, function($m) use ($messageId) {
        return $m['id'] != $messageId;
    });
    $messages = array_values($messages);
    
    if (count($messages) === $originalCount) {
        jsonResponse(false, '留言不存在');
    }
    
    $siteData['messages'] = $messages;
    writeJsonFile('site_data.json', $siteData);
    
    jsonResponse(true, '留言已删除');
}

/**
 * 简单的频率限制检测
 */
function checkRateLimit($ip) {
    $rateLimitFile = DATA_DIR . 'rate_limit.json';
    $rateLimit = [];
    
    if (file_exists($rateLimitFile)) {
        $rateLimit = json_decode(file_get_contents($rateLimitFile), true) ?: [];
    }
    
    $now = time();
    $window = 60; // 60秒窗口
    $maxRequests = 3; // 最多3次请求
    
    // 清理过期记录
    foreach ($rateLimit as $key => $data) {
        if ($now - $data['time'] > $window) {
            unset($rateLimit[$key]);
        }
    }
    
    // 检查当前IP
    if (isset($rateLimit[$ip])) {
        if ($rateLimit[$ip]['count'] >= $maxRequests) {
            return true; // 超过限制
        }
        $rateLimit[$ip]['count']++;
    } else {
        $rateLimit[$ip] = [
            'time' => $now,
            'count' => 1
        ];
    }
    
    file_put_contents($rateLimitFile, json_encode($rateLimit));
    
    return false;
}
