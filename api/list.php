<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// 简单的文件列表API（模拟数据）
$response = [
    'success' => true,
'files' => [
    [
        'name' => '文档',
'type' => 'folder',
'path' => './文档',
'size' => '2.3 MB',
'modified' => '2024-01-15'
    ],
[
    'name' => '图片',
'type' => 'folder',
'path' => './图片',
'size' => '15.7 MB',
'modified' => '2024-01-14'
],
[
    'name' => 'project.zip',
'type' => 'zip',
'path' => './project.zip',
'size' => '45.2 MB',
'modified' => '2024-01-12',
'download' => 'https://github.com/FY-Studio/fystudio.github.io/raw/main/project.zip'
]
]
];

echo json_encode($response);
?>
