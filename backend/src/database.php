<?php

function getDb(): PDO {
    $databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? null);
    if (!$databaseUrl) throw new PDOException("DATABASE_URL が設定されていません。");

    /** @var array{host?: string, port?: int, path?: string, user?: string, pass?: string}|false $url */
    $url = parse_url($databaseUrl);
    if ($url === false || empty($url['host'])) throw new PDOException("DATABASE_URL のパースに失敗しました。");

    $dsn = sprintf(
        "pgsql:host=%s;port=%s;dbname=%s;user=%s;password=%s;sslmode=require",
        $url['host'],
        $url['port'] ?? '5432',
        ltrim($url['path'] ?? '', '/'),
        urldecode($url['user'] ?? ''),
        urldecode($url['pass'] ?? '')
    );
    $db = new PDO($dsn);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
}

function initTables(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            initial_moya TEXT NOT NULL,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS roadmaps (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS daily_reports (
            id SERIAL PRIMARY KEY,
            progress TEXT NOT NULL,
            improvements TEXT NOT NULL,
            tomorrow TEXT NOT NULL,
            ai_feedback TEXT,
            report_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");
}
