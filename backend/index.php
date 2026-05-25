<?php
$allowedOrigin = getenv('FRONTEND_URL') ?: '*';
header("Access-Control-Allow-Origin: {$allowedOrigin}");
if ($allowedOrigin !== '*') header("Vary: Origin");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/health') {
    echo json_encode(['status' => 'ok']);
    exit(0);
}

// .env 読み込み
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        [$name, $value] = explode('=', $line, 2);
        $name  = trim($name);
        $value = trim($value, "'\"");
        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
    }
}

require_once __DIR__ . '/src/database.php';
require_once __DIR__ . '/src/claude.php';
require_once __DIR__ . '/src/sessions.php';

try {
    $db     = getDb();
    initTables($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts  = array_values(array_filter(explode('/', trim($uri, '/'))));
    $apiKey = getenv('ANTHROPIC_API_KEY') ?: ($_ENV['ANTHROPIC_API_KEY'] ?? '');

    routeSessions($db, $method, $parts, $apiKey);

} catch (Exception $e) {
    http_response_code(500);
    error_log('[moya] ' . $e->getMessage());
    echo json_encode(['error' => 'サーバーエラーが発生しました']);
}
