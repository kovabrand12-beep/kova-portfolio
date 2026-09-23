<?php
/**
 * Booking form handler.
 *
 * The client-side checks in assets/forms.js are for speed of feedback and
 * can be bypassed, so everything is validated again here. This file is what
 * actually decides whether a submission is accepted.
 *
 * Every accepted lead is written to disk before the email is attempted,
 * because email silently fails and "I never got it" needs a better answer
 * than a shrug. See leads_dir() for where that is and why.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/* ------------------------------------------------------------- settings */

const NOTIFY_TO      = 'kova.brand12@gmail.com';
const MIN_FILL_MS    = 2500;   // a human takes longer than this to fill a form
const MAX_PER_HOUR   = 5;      // per IP address
const MAX_FIELD_LEN  = 2000;
const RATE_TTL       = 3600;   // how long one submission counts against an IP

/**
 * Where leads are stored.
 *
 * One level ABOVE the web root when that is writable, so the files are not
 * served even if .htaccess goes missing. That is not a hypothetical: the
 * single most common deploy mistake here is an FTP client skipping the
 * dotfile, and this folder holds names, email addresses and IPs.
 *
 * Falls back to ./leads, which .htaccess denies, and which additionally
 * gets its own deny file written below.
 */
function leads_dir(): string {
    $outside = dirname(__DIR__) . '/kova-leads';
    if (is_dir($outside) || @mkdir($outside, 0750, true)) {
        if (is_writable($outside)) {
            return $outside;
        }
    }
    $inside = __DIR__ . '/leads';
    if (!is_dir($inside)) {
        @mkdir($inside, 0750, true);
    }
    /* Belt and braces for the fallback: a deny file of its own, so the
       folder is still protected if the site-wide .htaccess is missing. */
    $guard = $inside . '/.htaccess';
    if (is_dir($inside) && !file_exists($guard)) {
        @file_put_contents($guard, "Require all denied\n");
    }
    return $inside;
}

/**
 * True if we can actually write where we think we can.
 *
 * Worth checking separately: if neither location is writable the enquiry is
 * emailed and nothing is kept, and on a host where mail also fails that is
 * an enquiry that simply disappears. Better to know.
 */
function leads_writable(string $dir): bool {
    return is_dir($dir) && is_writable($dir);
}

/* Returns void rather than never: `never` is PHP 8.1+, and a host still
   on 8.0 would fail to parse this file at all, which shows up as a 500 on
   every submission with nothing in the response to explain it. */
function fail(string $msg, int $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function succeed(string $msg) {
    echo json_encode(['ok' => true, 'message' => $msg]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('This endpoint only accepts form submissions.', 405);
}

/* ---------------------------------------------------------- spam checks */

/* 1. Honeypot. The "company" field is positioned off-screen and marked
      aria-hidden with tabindex -1, so no person fills it in. Bots fill
      every field they find. Answer as though it worked, because telling a bot it
      was caught only helps it try again differently. */
if (trim((string)($_POST['company'] ?? '')) !== '') {
    succeed('Thanks. We will be in touch shortly.');
}

/* 2. Timing. Measured from the first interaction with the form, not from
      page load, so a page left open in a tab is not penalised. */
$elapsed = (int)($_POST['elapsed'] ?? 0);
if ($elapsed > 0 && $elapsed < MIN_FILL_MS) {
    succeed('Thanks. We will be in touch shortly.');
}

/* 3. Per-IP rate limit. Cheap file-based counter; no database needed. */
$LEADS = leads_dir();
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$now = time();

/* One counter file per IP, and nothing ever deleted them. A spread-out bot
   hitting from thousands of addresses would have filled the disk, or more
   likely the inode quota on shared hosting, and taken the site down with
   it. Sweep expired counters on roughly one request in twenty: often
   enough to stay bounded, rare enough not to cost anything. */
if (random_int(1, 20) === 1) {
    foreach (glob($LEADS . '/.rate-*.json') ?: [] as $stale) {
        if (@filemtime($stale) < $now - RATE_TTL) {
            @unlink($stale);
        }
    }
}

$rate_file = $LEADS . '/.rate-' . hash('sha256', $ip) . '.json';
$hits = [];
if (is_readable($rate_file)) {
    $hits = json_decode((string)file_get_contents($rate_file), true) ?: [];
}
if (!is_array($hits)) {
    $hits = [];
}
$hits = array_values(array_filter($hits, fn($t) => $now - (int)$t < RATE_TTL));
if (count($hits) >= MAX_PER_HOUR) {
    fail('That is a lot of requests in a short time. Please email us instead and we will sort it out.', 429);
}
$hits[] = $now;
/* Cap what we keep, so a tampered or corrupted file cannot grow unbounded. */
$hits = array_slice($hits, -MAX_PER_HOUR);
@file_put_contents($rate_file, json_encode($hits), LOCK_EX);

/* ---------------------------------------------------------- validation */

function field(string $key, int $max = MAX_FIELD_LEN): string {
    $v = trim((string)($_POST[$key] ?? ''));
    /* Strip control characters, including the CR/LF that header injection
       needs, before the value goes anywhere near an email header. */
    $v = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v) ?? '';
    return mb_substr($v, 0, $max);
}

$errors = [];

$name = field('name', 120);
if ($name === '') {
    $errors[] = 'a name';
}

$email = field('email', 200);
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'a valid email address';
}

$notes = field('notes', 1000);
if ($notes === '') {
    $errors[] = 'a message';
}

if ($errors) {
    fail('Please give us ' . implode(', ', $errors) . '.');
}

/* -------------------------------------------------------------- record */

$lead = [
    'received'  => gmdate('c', $now),
    'name'      => $name,
    'email'     => $email,
    'notes'     => $notes,
    'ip'        => $ip,
    'agent'     => mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200),
];

if (!leads_writable($LEADS)) {
    /* Nowhere to store it. Say so in the response headers rather than
       failing silently, and let the email attempt below go ahead anyway,
       because an emailed enquiry beats a lost one. */
    header('X-Kova-Storage: unwritable');
    error_log('Kova: cannot write enquiries to ' . $LEADS);
}

$stored = @file_put_contents(
    $LEADS . '/enquiries-' . gmdate('Y-m', $now) . '.jsonl',
    json_encode($lead, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

/* The same enquiries again as a spreadsheet. The .jsonl above is the record
   of truth and keeps every field; this one exists so the enquiries can be
   opened in Excel or Numbers without anyone having to read JSON. */
$csv = $LEADS . '/enquiries-' . gmdate('Y-m', $now) . '.csv';
$new_csv = !file_exists($csv);
$fh = @fopen($csv, 'a');
if ($fh !== false) {
    if (flock($fh, LOCK_EX)) {
        if ($new_csv) {
            fputcsv($fh, ['Received', 'Name', 'Email', 'Message']);
        }
        /* fputcsv handles the quoting, so a comma or a line break inside a
           message cannot shift the columns. */
        fputcsv($fh, [
            gmdate('Y-m-d H:i', $now),
            $name,
            $email,
            $notes,
        ]);
        flock($fh, LOCK_UN);
    }
    fclose($fh);
}

/* --------------------------------------------------------------- email */

/* Optional SMTP settings, read from a file that is NOT in this repository.
   Create mail-config.php next to this file on the server:

     <?php return [
       'from'     => 'no-reply@kova-scaling.com',
       'smtp'     => 'smtp.hostinger.com',
       'port'     => 465,
       'user'     => 'no-reply@kova-scaling.com',
       'pass'     => 'the mailbox password',
     ];

   Credentials never belong in version control, which is why this is a
   separate file and why .gitignore excludes it. Leave it out entirely and
   the script falls back to PHP mail(), which is fine on hosts where mail()
   works. */
$mailcfg = [];
if (is_readable(__DIR__ . '/mail-config.php')) {
    $loaded = require __DIR__ . '/mail-config.php';
    if (is_array($loaded)) {
        $mailcfg = $loaded;
    }
}

/* The From address must be a real mailbox on this domain. Hosts reject mail
   claiming to be from a domain they host when the mailbox does not exist,
   and that rejection is silent: mail() returns true and nothing arrives.
   This is the single most common reason a contact form "works" but no email
   ever turns up. */
$from = $mailcfg['from'] ?? 'no-reply@kova-scaling.com';

$subject = 'Website enquiry from ' . $name;
$body = "New enquiry from the Kova website.\n\n"
    . "Name:      {$name}\n"
    . "Email:     {$email}\n"
    . "Message:   {$notes}\n\n"
    . "Received:  " . gmdate('c', $now) . "\n"
    . "Stored:    " . ($stored !== false ? 'yes' : 'NO, check folder permissions') . "\n";

$sent = false;
$mailerror = '';

if (!empty($mailcfg['smtp'])) {
    /* Minimal SMTP over TLS. Enough for one short plain-text message, and it
       avoids adding a mail library to a project with no dependencies. */
    $sent = smtp_send($mailcfg, NOTIFY_TO, $subject, $body, $name, $email, $mailerror);
} else {
    $headers = [
        'From: Kova Website <' . $from . '>',
        'Reply-To: ' . $name . ' <' . $email . '>',
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
    ];
    $sent = @mail(NOTIFY_TO, $subject, $body, implode("\r\n", $headers), '-f' . $from);
    if (!$sent) {
        $mailerror = 'mail() returned false';
    }
}

/* A failure here is invisible to the visitor, so it has to be visible to
   you. Without this you find out weeks later that the inbox is empty. */
if (!$sent) {
    @file_put_contents(
        $LEADS . '/mail-failures.log',
        gmdate('c', $now) . "\t" . $email . "\t" . ($mailerror ?: 'unknown') . "\n",
        FILE_APPEND | LOCK_EX
    );
}

/* The lead is safe on disk even if the mail server is having a bad day, so
   this is still a success from the visitor's point of view. */
if (!$sent && $stored === false) {
    fail('We could not record that request. Please email us directly and we will book you in.', 500);
}

/**
 * Sends one plain-text message over SMTP. Implicit TLS on 465, STARTTLS on
 * 587. Returns true on success; on failure $err carries the server's reply
 * so the log says what actually went wrong.
 */
function smtp_send(array $cfg, string $to, string $subject, string $body,
                   string $replyName, string $replyEmail, string &$err): bool {
    $host = $cfg['smtp'];
    $port = (int)($cfg['port'] ?? 465);
    $from = $cfg['from'] ?? $cfg['user'];
    $secure = $port === 465 ? 'ssl://' : '';

    $fp = @stream_socket_client($secure . $host . ':' . $port, $errno, $errstr, 15);
    if (!$fp) {
        $err = 'connect failed: ' . $errstr;
        return false;
    }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp) {
        $out = '';
        while (($line = fgets($fp, 515)) !== false) {
            $out .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break;
        }
        return $out;
    };
    $cmd = function (string $c) use ($fp, $read) {
        fwrite($fp, $c . "\r\n");
        return $read();
    };
    $ok = function (string $r, string $code) { return strpos($r, $code) === 0; };

    $greet = $read();
    if (!$ok($greet, '220')) { $err = 'greeting: ' . trim($greet); fclose($fp); return false; }

    $ehlo = $cmd('EHLO kova-scaling.com');
    if ($port === 587) {
        $tls = $cmd('STARTTLS');
        if (!$ok($tls, '220')) { $err = 'starttls: ' . trim($tls); fclose($fp); return false; }
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $err = 'tls handshake failed';
            fclose($fp);
            return false;
        }
        $ehlo = $cmd('EHLO kova-scaling.com');
    }
    if (!$ok($ehlo, '250')) { $err = 'ehlo: ' . trim($ehlo); fclose($fp); return false; }

    $cmd('AUTH LOGIN');
    $u = $cmd(base64_encode((string)$cfg['user']));
    $pw = $cmd(base64_encode((string)$cfg['pass']));
    if (!$ok($pw, '235')) { $err = 'auth: ' . trim($pw); fclose($fp); return false; }

    $mf = $cmd('MAIL FROM:<' . $from . '>');
    if (!$ok($mf, '250')) { $err = 'mail from: ' . trim($mf); fclose($fp); return false; }
    $rc = $cmd('RCPT TO:<' . $to . '>');
    if (!$ok($rc, '250')) { $err = 'rcpt to: ' . trim($rc); fclose($fp); return false; }
    $dt = $cmd('DATA');
    if (!$ok($dt, '354')) { $err = 'data: ' . trim($dt); fclose($fp); return false; }

    $headers = "From: Kova Website <{$from}>\r\n"
        . "Reply-To: {$replyName} <{$replyEmail}>\r\n"
        . "To: <{$to}>\r\n"
        . 'Subject: ' . $subject . "\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=utf-8\r\n"
        . 'Date: ' . date('r') . "\r\n";

    /* A lone "." on a line ends the message, so any such line in the body
       has to be escaped or the mail is truncated there. */
    $safeBody = preg_replace('/^\./m', '..', $body);

    $end = $cmd($headers . "\r\n" . $safeBody . "\r\n.");
    fwrite($fp, "QUIT\r\n");
    fclose($fp);

    if (!$ok($end, '250')) { $err = 'send: ' . trim($end); return false; }
    return true;
}

succeed('Got it. We will reply to ' . htmlspecialchars($email, ENT_QUOTES) . ' shortly, usually the same day.');
