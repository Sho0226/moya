<?php

function routeReports(PDO $db, string $method, array $parts, string $apiKey): void {
    if ($method === 'GET' && count($parts) === 1) {
        listReports($db);
    } elseif ($method === 'POST' && count($parts) === 1) {
        createReport($db, $apiKey);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}

function listReports(PDO $db): void {
    $stmt = $db->query("SELECT * FROM daily_reports ORDER BY report_date DESC, created_at DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function createReport(PDO $db, string $apiKey): void {
    $input       = json_decode(file_get_contents('php://input'), true);
    $progress    = trim($input['progress']    ?? '');
    $improvements = trim($input['improvements'] ?? '');
    $tomorrow    = trim($input['tomorrow']    ?? '');

    if (!$progress || !$improvements || !$tomorrow) {
        http_response_code(400);
        echo json_encode(['error' => 'すべての項目を入力してください']);
        return;
    }

    foreach ([$progress, $improvements, $tomorrow] as $field) {
        if (mb_strlen($field) > 2000) {
            http_response_code(400);
            echo json_encode(['error' => '各項目は2000文字以内で入力してください']);
            return;
        }
    }

    $reportContent = "【前進したこと・学んだこと・気づき】\n{$progress}\n\n【改善点（Fightポイント）】\n{$improvements}\n\n【明日への期待】\n{$tomorrow}";
    $aiFeedback    = callClaude($apiKey, [['role' => 'user', 'content' => $reportContent]], DAILY_REPORT_SYSTEM);

    $stmt = $db->prepare(
        "INSERT INTO daily_reports (progress, improvements, tomorrow, ai_feedback)
         VALUES (:progress, :improvements, :tomorrow, :ai_feedback)
         RETURNING id, report_date, created_at"
    );
    $stmt->execute([
        ':progress'     => $progress,
        ':improvements' => $improvements,
        ':tomorrow'     => $tomorrow,
        ':ai_feedback'  => $aiFeedback,
    ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode([
        'id'           => (int)$row['id'],
        'progress'     => $progress,
        'improvements' => $improvements,
        'tomorrow'     => $tomorrow,
        'ai_feedback'  => $aiFeedback,
        'report_date'  => $row['report_date'],
        'created_at'   => $row['created_at'],
    ]);
}
