<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

echo json_encode([
    "message" => "moyaのAPIサーバーへようこそ！接続成功です。"
]);
