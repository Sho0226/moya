<?php

function routeRoadmaps(PDO $db, string $method, array $parts, string $apiKey): void {
    if ($method === 'GET' && count($parts) === 1) {
        getLatestRoadmap($db);
    } elseif ($method === 'POST' && count($parts) === 1) {
        generateRoadmap($db, $apiKey);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}

function getLatestRoadmap(PDO $db): void {
    $type = $_GET['type'] ?? '';
    if ($type !== 'moya' && $type !== 'report') {
        http_response_code(400);
        echo json_encode(['error' => 'type は moya または report を指定してください']);
        return;
    }

    $stmt = $db->prepare(
        "SELECT * FROM roadmaps WHERE type = :type ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute([':type' => $type]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode($row ?: null);
}

function generateRoadmap(PDO $db, string $apiKey): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $type  = $input['type'] ?? '';

    if ($type !== 'moya' && $type !== 'report') {
        http_response_code(400);
        echo json_encode(['error' => 'type は moya または report を指定してください']);
        return;
    }

    if ($type === 'moya') {
        $content = buildMoyaContext($db);
        $system  = ROADMAP_MOYA_SYSTEM;
    } else {
        $content = buildReportContext($db);
        $system  = ROADMAP_REPORT_SYSTEM;
    }

    if (!$content) {
        http_response_code(400);
        echo json_encode(['error' => '記録がまだありません']);
        return;
    }

    $roadmapText = callClaude(
        $apiKey,
        [['role' => 'user', 'content' => $content]],
        $system,
        2048
    );

    // コードブロックが含まれている場合は除去
    $roadmapText = preg_replace('/^```json\s*/m', '', $roadmapText);
    $roadmapText = preg_replace('/^```\s*/m', '', $roadmapText);
    $roadmapText = trim($roadmapText);

    $parsed = json_decode($roadmapText, true);
    if (!$parsed || !isset($parsed['timeline'])) {
        throw new Exception('ロードマップの生成に失敗しました。再試行してください。');
    }

    $stmt = $db->prepare(
        "INSERT INTO roadmaps (type, content) VALUES (:type, :content)
         RETURNING id, created_at"
    );
    $stmt->execute([':type' => $type, ':content' => $roadmapText]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode([
        'id'         => (int)$row['id'],
        'type'       => $type,
        'content'    => $roadmapText,
        'created_at' => $row['created_at'],
    ]);
}

function buildMoyaContext(PDO $db): string {
    $stmt = $db->query(
        "SELECT initial_moya, summary, created_at FROM sessions
         WHERE closed_at IS NOT NULL AND summary IS NOT NULL
         ORDER BY created_at ASC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) return '';

    $lines = [];
    foreach ($rows as $row) {
        $date    = date('Y/m/d', strtotime($row['created_at']));
        $lines[] = "[{$date}]\nモヤモヤ: {$row['initial_moya']}\n発見された前提: {$row['summary']}";
    }
    return implode("\n\n---\n\n", $lines);
}

function buildReportContext(PDO $db): string {
    $stmt = $db->query(
        "SELECT progress, improvements, tomorrow, report_date FROM daily_reports
         ORDER BY report_date ASC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) return '';

    $lines = [];
    foreach ($rows as $row) {
        $lines[] = "[{$row['report_date']}]\n前進・気づき: {$row['progress']}\nFightポイント: {$row['improvements']}\n明日への期待: {$row['tomorrow']}";
    }
    return implode("\n\n---\n\n", $lines);
}
