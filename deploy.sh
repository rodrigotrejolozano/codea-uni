#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

stage='validación inicial'
tmp_dir=''
backend_started=0

cleanup() {
  if [[ -n "$tmp_dir" && -d "$tmp_dir" ]]; then
    rm -rf -- "$tmp_dir"
  fi
}

on_error() {
  local code=$?
  printf '\nError durante %s (código %s).\n' "$stage" "$code" >&2
  if (( backend_started )); then
    printf 'El backend pudo haberse actualizado. Comprueba las versiones de ambos servicios antes de reintentar.\n' >&2
  fi
  exit "$code"
}
trap cleanup EXIT
trap on_error ERR

fail() { printf 'Error: %s\n' "$*" >&2; return 1; }
for tool in git node npm npx render curl tar mktemp cp; do
  command -v "$tool" >/dev/null || fail "Falta la herramienta: $tool"
done

stage='lectura de deploy.env'
[[ -f deploy.env && -r deploy.env ]] || fail 'No se puede leer deploy.env; copia deploy.env.example y configura sus valores'
unset RENDER_SERVICE_ID FRONTEND_URL BACKEND_URL DEPLOY_BRANCH
declare -A seen_config=()
line_number=0
while IFS= read -r line || [[ -n "$line" ]]; do
  ((line_number += 1))
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*(#.*)?$ ]] && continue
  if [[ ! "$line" =~ ^[[:space:]]*(RENDER_SERVICE_ID|FRONTEND_URL|BACKEND_URL|DEPLOY_BRANCH)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
    fail "Entrada inválida en deploy.env, línea $line_number; usa NOMBRE=valor"
  fi
  key="${BASH_REMATCH[1]}"
  value="${BASH_REMATCH[2]}"
  value="${value%"${value##*[![:space:]]}"}"
  [[ ! ${seen_config[$key]+present} ]] || fail "Variable duplicada en deploy.env: $key"
  seen_config[$key]=1
  if [[ "$value" =~ ^\"([^\"]*)\"$ || "$value" =~ ^\'([^\']*)\'$ ]]; then
    value="${BASH_REMATCH[1]}"
  elif [[ "$value" =~ [[:space:]\"\'] ]]; then
    fail "Valor inválido en deploy.env, línea $line_number"
  fi
  printf -v "$key" '%s' "$value"
done < deploy.env

: "${RENDER_SERVICE_ID:?Configura RENDER_SERVICE_ID con el ID del servicio web de Render}"
: "${FRONTEND_URL:?Configura FRONTEND_URL con la URL pública del frontend}"
: "${BACKEND_URL:?Configura BACKEND_URL con la URL pública del backend}"
: "${DEPLOY_BRANCH:?Configura DEPLOY_BRANCH con la rama de despliegue}"

[[ "$RENDER_SERVICE_ID" =~ ^srv-[a-zA-Z0-9]+$ ]] || fail 'RENDER_SERVICE_ID debe identificar un servicio web (srv-...)'
[[ "$FRONTEND_URL" =~ ^https://[^/[:space:]]+/?$ ]] || fail 'FRONTEND_URL debe ser un origen HTTPS público, sin ruta'
[[ "$BACKEND_URL" =~ ^https://[^/[:space:]]+/?$ ]] || fail 'BACKEND_URL debe ser un origen HTTPS público, sin ruta'
FRONTEND_URL="${FRONTEND_URL%/}"
BACKEND_URL="${BACKEND_URL%/}"

[[ "$(git rev-parse --show-toplevel)" == "$ROOT_DIR" ]] || fail 'El script debe estar en la raíz del repositorio'
[[ "$(git branch --show-current)" == "$DEPLOY_BRANCH" ]] || fail "Cambia a la rama $DEPLOY_BRANCH antes de desplegar"
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || fail 'Hay cambios sin confirmar; revísalos y súbelos antes de desplegar'
[[ -f .vercel/project.json ]] || fail 'El proyecto no está vinculado a Vercel; ejecuta npx vercel link desde la raíz'

stage='comprobación de GitHub'
commit="$(git rev-parse HEAD)"
git check-ref-format --branch "$DEPLOY_BRANCH" >/dev/null || fail 'DEPLOY_BRANCH no es una rama válida'
remote_refs="$(GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code --heads origin "refs/heads/$DEPLOY_BRANCH")" || fail "No se pudo consultar origin/$DEPLOY_BRANCH; revisa la conexión y autenticación de GitHub"
remote_commit="${remote_refs%%$'\t'*}"
[[ "$remote_commit" == "$commit" ]] || fail "El commit local no coincide con origin/$DEPLOY_BRANCH; revisa y sube tus cambios"

stage='comprobación de acceso a plataformas'
npx --no-install vercel --version >/dev/null || fail 'Vercel CLI no está disponible; instala la CLI o ejecútala previamente con npx vercel --version'
npx --no-install vercel whoami --non-interactive >/dev/null || fail 'No hay acceso a Vercel; ejecuta npx vercel login'
render services --output json --confirm >/dev/null || fail 'No hay acceso a Render; ejecuta render login y selecciona tu workspace'

stage='preparación del commit para Vercel'
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/codea-deploy.XXXXXXXX")"
git archive --format=tar "$commit" | tar -xf - -C "$tmp_dir"
mkdir -p "$tmp_dir/.vercel"
cp .vercel/project.json "$tmp_dir/.vercel/project.json"

check_url() {
  local url="$1" kind="$2" body attempt
  for attempt in {1..18}; do
    if body="$(curl --silent --show-error --fail --location --max-time 15 "$url" 2>/dev/null)"; then
      if [[ "$kind" != health ]] || printf '%s' "$body" | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{try{const v=JSON.parse(s);process.exit(v.status==="ok"&&v.database==="up"?0:1)}catch{process.exit(1)}})'; then
        return 0
      fi
    fi
    printf 'Esperando %s (%s/18)...\n' "$url" "$attempt"
    (( attempt == 18 )) || sleep 5
  done
  fail "El servicio no respondió correctamente: $url"
}

stage='despliegue del backend en Render'
printf 'Desplegando backend, commit %s...\n' "$commit"
backend_started=1
render deploys create "$RENDER_SERVICE_ID" --commit "$commit" --wait --confirm --output text

stage='verificación del backend y la base de datos'
check_url "$BACKEND_URL/health" health

stage='despliegue del frontend en Vercel'
printf 'Desplegando frontend desde el mismo commit...\n'
(cd "$tmp_dir" && npx --no-install vercel deploy --prod --yes --non-interactive)

stage='verificaciones finales'
check_url "$FRONTEND_URL" frontend
check_url "$BACKEND_URL/health" health
printf '\nDespliegue completado.\nCommit: %s\nFrontend: %s\nBackend: %s\n' "$commit" "$FRONTEND_URL" "$BACKEND_URL"
