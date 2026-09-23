<?php
/**
 * Router for PHP's built-in server, used by `npm run serve`.
 *
 * PHP's server has no .htaccess, so without this you get no clean URLs and
 * no custom 404. It does run PHP, which Apache on this machine does not,
 * so this is the preview that can actually test the contact form.
 *
 * It is a development convenience only and is never uploaded: the build
 * copies a fixed list of files and this is not on it.
 *
 * For testing redirects, HTTPS forcing and the protected folders, use
 * `npm run htaccess` instead. Only a real Apache reads the real rules.
 */

$root = __DIR__ . '/../UPLOAD-TO-HOSTINGER';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = rawurldecode($path);

/* Refuse anything trying to climb out of the served folder. */
if (strpos($path, '..') !== false) {
    http_response_code(400);
    exit('Bad request');
}

$file = $root . $path;

/* A real file: let the server handle it, except PHP which must be run. */
if (is_file($file)) {
    if (substr($file, -4) === '.php') {
        chdir(dirname($file));
        require $file;
        return true;
    }
    return false;
}

/* A directory: serve its index. */
if (is_dir($file) && is_file(rtrim($file, '/') . '/index.html')) {
    readfile(rtrim($file, '/') . '/index.html');
    return true;
}

/* Clean URL: /about serves about.html, the way .htaccess does live. */
if (is_file($file . '.html')) {
    readfile($file . '.html');
    return true;
}

/* The private paths .htaccess denies. Mirrored here so the preview does not
   quietly serve something the live site would refuse. */
if (preg_match('#^/(leads|automation|scripts|content|node_modules)(/|$)#', $path)
    || preg_match('#(^|/)\.#', $path)
    || preg_match('#\.(json|jsonl|md|lock|sh|cjs|yml|yaml)$#', $path)) {
    http_response_code(404);
    readfile($root . '/404.html');
    return true;
}

http_response_code(404);
readfile($root . '/404.html');
return true;
