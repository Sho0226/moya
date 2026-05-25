<?php

function routeSessions(PDO $db, string $method, array $parts, string $apiKey): void {
    $sessionId = isset($parts[1]) ? (int)$parts[1] : null;
    $action    = $parts[2] ?? null;

    if ($method === 'GET' && count($parts) <= 1) {
        listSessions($db);
    } elseif ($method === 'POST' && count($parts) === 1) {
        createSession($db, $apiKey);
    } elseif ($method === 'GET' && $sessionId && !$action) {
        getSession($db, $sessionId);
    } elseif ($method === 'POST' && $sessionId && $action === 'chat') {
        chatSession($db, $sessionId, $apiKey);
    } elseif ($method === 'POST' && $sessionId && $action === 'close') {
        closeSession($db, $sessionId, $apiKey);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}

function listSessions(PDO $db): void {
    $stmt = $db->query("SELECT * FROM sessions ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function createSession(PDO $db, string $apiKey): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $moya  = trim($input['moya'] ?? '');
    if (!$moya) {
        http_response_code(400);
        echo json_encode(['error' => 'moya は必須です']);
        return;
    }
    if (mb_strlen($moya) > 2000) {
        http_response_code(400);
        echo json_encode(['error' => 'moya は2000文字以内で入力してください']);
        return;
    }

    $stmt = $db->prepare("INSERT INTO sessions (initial_moya) VALUES (:moya) RETURNING id");
    $stmt->execute([':moya' => $moya]);
    $sessionId = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("INSERT INTO messages (session_id, role, content) VALUES (:sid, 'user', :content)");
    $stmt->execute([':sid' => $sessionId, ':content' => $moya]);

    $aiReply = callClaude($apiKey, [['role' => 'user', 'content' => $moya]], DIALOGUE_SYSTEM);

    $stmt = $db->prepare("INSERT INTO messages (session_id, role, content) VALUES (:sid, 'assistant', :content)");
    $stmt->execute([':sid' => $sessionId, ':content' => $aiReply]);

    http_response_code(201);
    echo json_encode(['session_id' => $sessionId, 'ai_reply' => $aiReply]);
}

function getSession(PDO $db, int $sessionId): void {
    $stmt = $db->prepare("SELECT * FROM sessions WHERE id = :id");
    $stmt->execute([':id' => $sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$session) {
        http_response_code(404);
        echo json_encode(['error' => 'セッションが見つかりません']);
        return;
    }

    $stmt = $db->prepare("SELECT * FROM messages WHERE session_id = :id ORDER BY created_at ASC");
    $stmt->execute([':id' => $sessionId]);
    echo json_encode(['session' => $session, 'messages' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function chatSession(PDO $db, int $sessionId, string $apiKey): void {
    $input       = json_decode(file_get_contents('php://input'), true);
    $userMessage = trim($input['message'] ?? '');
    if (!$userMessage) {
        http_response_code(400);
        echo json_encode(['error' => 'message は必須です']);
        return;
    }
    if (mb_strlen($userMessage) > 2000) {
        http_response_code(400);
        echo json_encode(['error' => 'message は2000文字以内で入力してください']);
        return;
    }

    $stmt = $db->prepare("SELECT closed_at FROM sessions WHERE id = :id");
    $stmt->execute([':id' => $sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$session || $session['closed_at']) {
        http_response_code(400);
        echo json_encode(['error' => 'セッションが存在しないか終了しています']);
        return;
    }

    $stmt = $db->prepare("INSERT INTO messages (session_id, role, content) VALUES (:sid, 'user', :content)");
    $stmt->execute([':sid' => $sessionId, ':content' => $userMessage]);

    $stmt = $db->prepare("SELECT role, content FROM messages WHERE session_id = :id ORDER BY created_at ASC");
    $stmt->execute([':id' => $sessionId]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $claudeMessages = array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], $history);
    $aiReply        = callClaude($apiKey, $claudeMessages, DIALOGUE_SYSTEM);

    $stmt = $db->prepare("INSERT INTO messages (session_id, role, content) VALUES (:sid, 'assistant', :content)");
    $stmt->execute([':sid' => $sessionId, ':content' => $aiReply]);

    echo json_encode(['ai_reply' => $aiReply]);
}

function closeSession(PDO $db, int $sessionId, string $apiKey): void {
    $stmt = $db->prepare("SELECT role, content FROM messages WHERE session_id = :id ORDER BY created_at ASC");
    $stmt->execute([':id' => $sessionId]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $claudeMessages = array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], $history);

    // Claude は最後がユーザーメッセージである必要があるため、トリガーを追加
    $closingTrigger = [...$claudeMessages, ['role' => 'user', 'content' => 'この対話を振り返り、締めくくりの言葉をお願いします。']];
    $summaryTrigger = [...$claudeMessages, ['role' => 'user', 'content' => 'この対話全体から、私が持っていた前提をまとめてください。']];

    // 締めくくりメッセージを生成してチャットに追加
    $closingMessage = callClaude($apiKey, $closingTrigger, CLOSING_SYSTEM);
    $stmt = $db->prepare("INSERT INTO messages (session_id, role, content) VALUES (:sid, 'assistant', :content)");
    $stmt->execute([':sid' => $sessionId, ':content' => $closingMessage]);

    // 前提のサマリーを生成
    $summary = callClaude($apiKey, $summaryTrigger, SUMMARY_SYSTEM);

    $stmt = $db->prepare("UPDATE sessions SET summary = :summary, closed_at = NOW() WHERE id = :id");
    $stmt->execute([':summary' => $summary, ':id' => $sessionId]);

    echo json_encode(['closing_message' => $closingMessage, 'summary' => $summary]);
}
