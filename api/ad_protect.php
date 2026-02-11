<?php
/**
 * 广告链接保护配置（建议使用 ionCube / SourceGuardian 等对该文件加密）
 * 加密后其他开发者无法查看密钥与路径，无法绕过广告保护；config/auth/data/message/nuke 仍可自由修改
 */

require_once __DIR__ . '/config.php';

define('AD_PROTECT_SECRET', 'a7f3b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7');
define('SITE_DISABLED_FILE', DATA_DIR . '.site_disabled');
define('CANONICAL_AD_URL', 'https://www.rainyun.com/freehost_');
