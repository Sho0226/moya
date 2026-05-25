<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// .env ファイルを読み込む
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, "'\"");
        putenv("{$name}={$value}");
        $_ENV[$name] = $value;
    }
}

try {
    // データベース接続
    $databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? null);
    if (!$databaseUrl) {
        throw new PDOException("DATABASE_URL が設定されていません。");
    }

    /** @var array{scheme?: string, host?: string, port?: int, path?: string, user?: string, pass?: string}|false $url */
    $url = parse_url($databaseUrl);
    if ($url === false || empty($url['host'])) {
        throw new PDOException("DATABASE_URL のパースに失敗しました。");
    }
    $host = $url['host'];
    $port = $url['port'] ?? '5432';
    $dbname = ltrim($url['path'], '/');
    $user = urldecode($url['user']);
    $password = urldecode($url['pass']);
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};user={$user};password={$password};sslmode=require";
    
    $db = new PDO($dsn);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // テーブル作成
    $db->exec("CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        hypothesis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // リクエスト処理
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM logs ORDER BY created_at DESC");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($logs);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['content']) && isset($input['hypothesis'])) {
            $stmt = $db->prepare("INSERT INTO logs (content, hypothesis) VALUES (:content, :hypothesis)");
            $stmt->bindParam(':content', $input['content']);
            $stmt->bindParam(':hypothesis', $input['hypothesis']);
            $stmt->execute();
            
            http_response_code(201);
            echo json_encode(["status" => "success", "message" => "Neonにモヤモヤを刻みました。"]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "データが足りません。"]);
        }
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}