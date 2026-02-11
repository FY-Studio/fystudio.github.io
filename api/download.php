<?php
// 简单的下载处理（需要真实文件存在）
$file = isset($_GET['file']) ? $_GET['file'] : '';

if (file_exists($file) && !is_dir($file)) {
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($file) . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
} else {
    http_response_code(404);
    echo '文件不存在';
}
?>
