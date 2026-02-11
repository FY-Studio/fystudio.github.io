<?php
/**
 * 广告链接校验：后端比对当前页面广告 href 与正确 URL，仅返回是否一致
 * 建议对该文件加密，防止被改为始终返回 valid:true 以绕过保护
 */

require_once __DIR__ . '/ad_protect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true) ?: [];
$href = isset($data['href']) ? trim($data['href']) : '';
$href = preg_replace('#/+$#', '', $href);

$canonical = trim(CANONICAL_AD_URL);
$canonical = preg_replace('#/+$#', '', $canonical);

$valid = ($href !== '' && $href === $canonical);
echo json_encode(['valid' => $valid], JSON_UNESCAPED_UNICODE);
