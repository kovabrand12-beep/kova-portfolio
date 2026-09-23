#!/bin/bash
# Serve UPLOAD-TO-HOSTINGER through a real Apache with the real .htaccess,
# and check every route, redirect and protection.
#
#   npm run test:htaccess
#
# PHP's built-in server ignores .htaccess entirely, which is how two broken
# rewrite rules reached the live site. This catches them before upload.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/kova-htaccess-test"
PORT=8088
H='X-Forwarded-Proto: https'   # skip the https redirect, as a proxy would

rm -rf "$WORK"; mkdir -p "$WORK/conf"
# macOS blocks Apache from reading ~/Desktop, so serve a copy.
cp -R "$ROOT/UPLOAD-TO-HOSTINGER" "$WORK/site" || { echo "run: npm run build"; exit 1; }
chmod -R a+rX "$WORK/site"

M=/usr/libexec/apache2
cat > "$WORK/conf/httpd.conf" <<CONF
ServerName localhost
Listen $PORT
PidFile $WORK/httpd.pid
ErrorLog $WORK/error.log
CustomLog $WORK/access.log common
LoadModule mpm_prefork_module $M/mod_mpm_prefork.so
LoadModule unixd_module       $M/mod_unixd.so
LoadModule authz_core_module  $M/mod_authz_core.so
LoadModule authz_host_module  $M/mod_authz_host.so
LoadModule log_config_module  $M/mod_log_config.so
LoadModule mime_module        $M/mod_mime.so
LoadModule dir_module         $M/mod_dir.so
LoadModule headers_module     $M/mod_headers.so
LoadModule expires_module     $M/mod_expires.so
LoadModule rewrite_module     $M/mod_rewrite.so
TypesConfig /private/etc/apache2/mime.types
DirectoryIndex index.html
DocumentRoot "$WORK/site"
<Directory "$WORK/site">
    AllowOverride All
    Require all granted
</Directory>
CONF

httpd -f "$WORK/conf/httpd.conf" -k start 2>/dev/null || { echo "could not start apache"; exit 1; }
sleep 2
fail=0
code() { curl -s -o /dev/null -w '%{http_code}' -H "$H" --max-time 5 "http://localhost:$PORT$1"; }
want() {  # path expected label
  got=$(code "$1")
  if [ "$got" = "$2" ]; then printf "  ok   %-38s %s\n" "$1" "$got"
  else printf "  FAIL %-38s got %s, wanted %s\n" "$1" "$got" "$2"; fail=$((fail+1)); fi
}

echo; echo "  pages"
for p in / /about /work-with-us /prompt-generator /book /privacy /terms; do want "$p" 200; done

echo; echo "  demo sites"
for d in bloom-cafe pulseops verde-goods atelier-noor summit-fitness northbeam-realty ember-oak anchor-home-services lumina-medspa; do
  want "/demos/$d/" 200
done
want /demos/bloom-cafe/menu 200
want /demos/ember-oak/reserve 200

echo; echo "  assets"
for p in /assets/main.css /assets/nav.js /assets/forms.js /assets/generator.js /assets/img/favicon.svg /assets/img/og-cover.jpg /sitemap.xml /robots.txt /llms.txt; do want "$p" 200; done

echo; echo "  .html redirects to the clean form"
for p in /about.html /index.html /work-with-us.html /demos/bloom-cafe/menu.html; do want "$p" 301; done

echo; echo "  protected"
for p in /leads/ /leads/enquiries-2026-09.jsonl /automation/book.js /scripts/build.cjs /content/site.cjs /package.json /.htaccess /README.md; do want "$p" 404; done

echo; echo "  trailing slash goes to the clean form"
want /about/ 301
end=$(curl -s -o /dev/null -w '%{http_code}' -L -H "$H" --max-time 8 "http://localhost:$PORT/about/")
eff=$(curl -s -o /dev/null -w '%{url_effective}' -L -H "$H" --max-time 8 "http://localhost:$PORT/about/")
if [ "$end" = "200" ] && [ "${eff##*/}" = "about" ]; then printf "  ok   %-38s lands on /about\n" "/about/ (followed)"
else printf "  FAIL %-38s ended %s at %s\n" "/about/ (followed)" "$end" "$eff"; fail=$((fail+1)); fi

echo; echo "  unknown url"
want /no-such-page 404

echo; echo "  no redirect loops"
for p in /about.html /index.html /work-with-us.html; do
  end=$(curl -s -o /dev/null -w '%{http_code}' -L -H "$H" --max-time 8 "http://localhost:$PORT$p")
  hops=$(curl -s -o /dev/null -w '%{num_redirects}' -L -H "$H" --max-time 8 "http://localhost:$PORT$p")
  if [ "$end" = "200" ] && [ "$hops" -le 2 ]; then printf "  ok   %-38s %s hop(s)\n" "$p" "$hops"
  else printf "  FAIL %-38s ended %s after %s hop(s)\n" "$p" "$end" "$hops"; fail=$((fail+1)); fi
done

httpd -f "$WORK/conf/httpd.conf" -k stop 2>/dev/null
echo
if [ "$fail" -eq 0 ]; then echo "  all checks passed"; else echo "  $fail check(s) FAILED"; fi
exit $fail
