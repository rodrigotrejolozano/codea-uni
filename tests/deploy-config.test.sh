#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/deploy-test.XXXXXXXX")"
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/repo/.vercel" "$fixture/bin"
git init -q -b main "$fixture/repo"
git init -q --bare "$fixture/remote.git"
cp "$root/deploy.sh" "$fixture/repo/deploy.sh"
printf '/deploy.env\n/.vercel/\n' > "$fixture/repo/.gitignore"
printf '{}\n' > "$fixture/repo/.vercel/project.json"
git -C "$fixture/repo" add deploy.sh .gitignore
git -C "$fixture/repo" -c user.name=Test -c user.email=test@example.com commit -qm fixture
git -C "$fixture/repo" remote add origin "$fixture/remote.git"
git -C "$fixture/repo" push -q origin main

cat > "$fixture/bin/render" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$CALL_LOG"
EOF
cat > "$fixture/bin/npx" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$fixture/bin/curl" <<'EOF'
#!/usr/bin/env bash
case "$*" in */health*) printf '{"status":"ok","database":"up"}';; *) printf 'ok';; esac
EOF
chmod +x "$fixture/bin/render" "$fixture/bin/npx" "$fixture/bin/curl"
export PATH="$fixture/bin:$PATH" CALL_LOG="$fixture/calls"
cd "$fixture/repo"

assert_failure_without_deploy() {
  : > "$CALL_LOG"
  if ./deploy.sh > "$fixture/output" 2>&1; then
    printf 'Se esperaba un error: %s\n' "$1" >&2
    exit 1
  fi
  if grep -q 'deploys create' "$CALL_LOG"; then
    printf 'No debía iniciarse un despliegue: %s\n' "$1" >&2
    exit 1
  fi
}

assert_failure_without_deploy 'archivo ausente'
grep -q 'No se puede leer deploy.env' "$fixture/output"

cat > deploy.env <<'EOF'
RENDER_SERVICE_ID=srv-fixture
FRONTEND_URL=https://frontend.example
BACKEND_URL=https://backend.example
DEPLOY_BRANCH=main
EOF
export RENDER_SERVICE_ID=srv-incorrect FRONTEND_URL=https://wrong.example BACKEND_URL=https://wrong.example DEPLOY_BRANCH=incorrect
./deploy.sh > "$fixture/output"
grep -q 'deploys create srv-fixture' "$CALL_LOG"
grep -q 'Frontend: https://frontend.example' "$fixture/output"
./deploy.sh > "$fixture/output"

cat > deploy.env <<'EOF'
# Se admiten espacios y comillas sin ejecutar código.
RENDER_SERVICE_ID="srv-fixture"
FRONTEND_URL='https://frontend.example'
BACKEND_URL = "https://backend.example"
DEPLOY_BRANCH=main
EOF
./deploy.sh > "$fixture/output"

printf '\nRENDER_SERVICE_ID=srv-duplicado\n' >> deploy.env
assert_failure_without_deploy 'variable duplicada'
grep -q 'Variable duplicada' "$fixture/output"

printf 'RENDER_SERVICE_ID=$(touch${IFS}%s)\n' "$fixture/executed" > deploy.env
cat >> deploy.env <<'EOF'
FRONTEND_URL=https://frontend.example
BACKEND_URL=https://backend.example
DEPLOY_BRANCH=main
EOF
assert_failure_without_deploy 'expresión de shell no ejecutable'
grep -q 'RENDER_SERVICE_ID debe identificar' "$fixture/output"
[[ ! -e "$fixture/executed" ]]

cat > deploy.env <<'EOF'
RENDER_SERVICE_ID=srv-fixture
FRONTEND_URL=https://frontend.example
BACKEND_URL=https://backend.example
EOF
assert_failure_without_deploy 'variable ausente'
grep -q 'DEPLOY_BRANCH' "$fixture/output"

printf '\nVARIABLE_DESCONOCIDA=valor\n' >> deploy.env
assert_failure_without_deploy 'variable desconocida'
grep -q 'Entrada inválida' "$fixture/output"

printf 'Pruebas de configuración de despliegue superadas.\n'
