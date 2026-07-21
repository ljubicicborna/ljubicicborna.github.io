<?php
/* =====================================================================
   Hedonist CMS — prijenosna točka za spremanje.
   ---------------------------------------------------------------------
   Ovo je JEDINA datoteka koja treba server (PHP). Sprema izmjene iz
   /admin.html izravno u data/*.json na hostingu. Radi na svakom hostingu
   koji podržava PHP (skoro svaki jeftini/cPanel hosting) — samo uploadaj
   cijeli projekt i radi. Ako hosting NEMA PHP, /admin.html se automatski
   prebaci na "preuzmi datoteku pa je ručno uploadaj".

   POSTAVI LOZINKU: promijeni vrijednost $PASSWORD ispod prije objave.
   ===================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$PASSWORD = 'promijeni-me';   // <-- OVDJE upiši svoju lozinku za uređivanje

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
  http_response_code(400);
  echo json_encode(['error' => 'bad-request']);
  exit;
}

$action = isset($body['action']) ? $body['action'] : '';
$given  = isset($body['password']) ? (string)$body['password'] : '';

/* usporedba lozinke otporna na mjerenje vremena */
function pw_ok($a, $b) {
  if (function_exists('hash_equals')) return hash_equals((string)$a, (string)$b);
  return (string)$a === (string)$b;
}

if ($action === 'login') {
  if (pw_ok($given, $PASSWORD)) { echo json_encode(['ok' => true]); }
  else { http_response_code(401); echo json_encode(['error' => 'unauthorized']); }
  exit;
}

if ($action === 'upload') {
  if (!pw_ok($given, $PASSWORD)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
  }
  $name = isset($body['filename']) ? basename((string)$body['filename']) : '';
  $content = isset($body['content']) ? (string)$body['content'] : '';
  if ($name === '' || $content === '') {
    http_response_code(400);
    echo json_encode(['error' => 'no-file']);
    exit;
  }
  /* skini "data:...;base64," prefiks ako postoji */
  $comma = strpos($content, ',');
  if (strpos($content, 'base64') !== false && $comma !== false) {
    $content = substr($content, $comma + 1);
  }
  $bytes = base64_decode($content, true);
  if ($bytes === false) {
    http_response_code(400);
    echo json_encode(['error' => 'bad-image']);
    exit;
  }
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  $okExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];
  if (!in_array($ext, $okExt, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'bad-type']);
    exit;
  }
  $safe = preg_replace('/[^a-zA-Z0-9._-]/', '-', pathinfo($name, PATHINFO_FILENAME));
  $file = $safe . '-' . time() . '.' . $ext;
  $dir = __DIR__ . '/assets/images/cms';
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
  $ok = @file_put_contents($dir . '/' . $file, $bytes);
  if ($ok === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write-failed']);
  } else {
    echo json_encode(['ok' => true, 'url' => 'assets/images/cms/' . $file]);
  }
  exit;
}

if ($action === 'save') {
  if (!pw_ok($given, $PASSWORD)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
  }
  $vrsta = isset($body['vrsta']) ? $body['vrsta'] : '';
  $allowed = ['cjenik', 'tekstovi', 'dogadjaji', 'slike', 'galerija', 'faq'];
  if (!in_array($vrsta, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'unknown-vrsta']);
    exit;
  }
  if (!array_key_exists('data', $body)) {
    http_response_code(400);
    echo json_encode(['error' => 'no-data']);
    exit;
  }
  $dir = __DIR__ . '/data';
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
  $json = json_encode($body['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) {
    http_response_code(400);
    echo json_encode(['error' => 'bad-json']);
    exit;
  }
  $ok = @file_put_contents($dir . '/' . $vrsta . '.json', $json . "\n", LOCK_EX);
  if ($ok === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write-failed']);
  } else {
    echo json_encode(['ok' => true]);
  }
  exit;
}

http_response_code(400);
echo json_encode(['error' => 'unknown-action']);
