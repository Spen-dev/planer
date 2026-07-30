#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KEY_DIR="$ROOT/keystore"
KEYSTORE="$KEY_DIR/planer-release.jks"
PROPS="$ROOT/keystore.properties"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  exit 0
fi

PASSWORD="${PLANER_KEYSTORE_PASSWORD:-planer-change-me}"
mkdir -p "$KEY_DIR"

keytool -genkeypair -v \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$PASSWORD" \
  -keypass "$PASSWORD" \
  -alias planer \
  -keystore "$KEYSTORE" \
  -dname "CN=Planer, OU=Mobile, O=Spen, L=Unknown, ST=Unknown, C=RU"

cat > "$PROPS" <<EOF
storeFile=keystore/planer-release.jks
storePassword=$PASSWORD
keyAlias=planer
keyPassword=$PASSWORD
EOF

echo "Created: $KEYSTORE"
echo "Created: $PROPS"
