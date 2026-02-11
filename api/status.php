<?php
/**
 * 站点状态：是否已因安全原因禁用（广告链接被篡改时由后台触发）
 * 建议对该文件加密，防止被改为始终返回 disabled:false 以绕过整站禁用
 */

require_once __DIR__ . '/ad_protect.php';

$disabled = file_exists(SITE_DISABLED_FILE);
echo json_encode(['disabled' => $disabled], JSON_UNESCAPED_UNICODE);
