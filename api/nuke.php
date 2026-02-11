<?php
/**
 * 一键跑路 API
 * 校验后台密码后删除全站文件，仅保留「站长已跑路」页面
 * 不可逆，请谨慎使用
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, '仅支持 POST');
}

$input = getPostData();
$password = $input['password'] ?? '';

if (empty($password)) {
    jsonResponse(false, '请输入后台密码');
}

$auth = readJsonFile('auth.json');
if (!$auth || !password_verify($password, $auth['password'])) {
    jsonResponse(false, '密码错误');
}

$root = dirname(__DIR__);

/** 递归删除目录及内容 */
function deleteDir($path) {
    if (!file_exists($path) || !is_dir($path)) {
        return;
    }
    $items = array_diff(scandir($path), ['.', '..']);
    foreach ($items as $item) {
        $full = $path . DIRECTORY_SEPARATOR . $item;
        if (is_dir($full)) {
            deleteDir($full);
        } else {
            @unlink($full);
        }
    }
    @rmdir($path);
}

/** 跑路页 HTML */
$nukeHtml = '<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>站长已跑路</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e2e8f0;
            font-family: "Microsoft YaHei", sans-serif;
            text-align: center;
            padding: 20px;
        }
        .box {
            max-width: 420px;
            padding: 48px 40px;
            background: rgba(255,255,255,0.06);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        h1 { font-size: 2rem; margin-bottom: 16px; font-weight: 600; }
        p { color: #94a3b8; font-size: 1rem; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="box">
        <h1>站长已跑路</h1>
        <p>本站已停止运营，感谢曾经的访问。</p>
    </div>
</body>
</html>';

// 1. 先写入新首页（之后任何访问都只看到跑路页）
if (file_put_contents($root . DIRECTORY_SEPARATOR . 'index.html', $nukeHtml) === false) {
    jsonResponse(false, '无法写入首页');
}

// 2. 删除子目录
$dirsToDelete = ['admin', 'css', 'js'];
foreach ($dirsToDelete as $dir) {
    $path = $root . DIRECTORY_SEPARATOR . $dir;
    if (is_dir($path)) {
        deleteDir($path);
    }
}

// 3. 删除 api 目录内容（含 data 与所有 php）
$apiDir = $root . DIRECTORY_SEPARATOR . 'api';
if (is_dir($apiDir)) {
    $items = array_diff(scandir($apiDir), ['.', '..']);
    foreach ($items as $item) {
        $full = $apiDir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($full)) {
            deleteDir($full);
        } else {
            @unlink($full);
        }
    }
    @rmdir($apiDir);
}

// 4. 删除根目录其他文件
$rootFiles = ['.htaccess', '优点.txt'];
foreach ($rootFiles as $file) {
    $path = $root . DIRECTORY_SEPARATOR . $file;
    if (file_exists($path) && is_file($path)) {
        @unlink($path);
    }
}

jsonResponse(true, '站点已关闭，仅保留跑路页');
