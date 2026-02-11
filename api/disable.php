<?php
/**
 * 触发整站禁用（仅当广告链接保护校验失败时由后台调用，需携带密钥）
 * 建议对该文件加密，防止被修改或删除以绕过广告保护
 */

require_once __DIR__ . '/ad_protect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

$input = file_get_contents('php://input');
$data = json_decode($input, true) ?: [];
$secret = $data['secret'] ?? '';

if ($secret !== AD_PROTECT_SECRET) {
    http_response_code(403);
    jsonResponse(false, 'Forbidden');
}

file_put_contents(SITE_DISABLED_FILE, date('Y-m-d H:i:s'));
jsonResponse(true, 'OK');
