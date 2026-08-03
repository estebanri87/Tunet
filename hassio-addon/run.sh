#!/usr/bin/with-contenv bashio
echo "Starting Nyx Dashboard..."
cd /app
export NODE_ENV=production
export PORT=3002
export NYX_TRUST_SUPERVISOR_INGRESS=1
# The production image installs Node via `apk add nodejs` (see Dockerfile),
# so the exact V8 build/version isn't pinned and its default heap ceiling
# can land well under the host's actual available RAM. Set it explicitly
# so a large Home Assistant instance (many entities/profiles) doesn't
# crash-loop against an arbitrary default.
export NODE_OPTIONS="--max-old-space-size=2560"

if bashio::config.has_value 'data_encryption_mode'; then
	export NYX_ENCRYPTION_MODE="$(bashio::config 'data_encryption_mode')"
fi

if bashio::config.has_value 'data_encryption_key'; then
	export NYX_DATA_KEY="$(bashio::config 'data_encryption_key')"
fi

if bashio::config.has_value 'data_encryption_salt'; then
	export NYX_DATA_KEY_SALT="$(bashio::config 'data_encryption_salt')"
fi

if [ "${NYX_ENCRYPTION_MODE}" = "dual" ] || [ "${NYX_ENCRYPTION_MODE}" = "enc_only" ]; then
	if [ -z "${NYX_DATA_KEY}" ]; then
		bashio::log.fatal "data_encryption_key is required when data_encryption_mode is '${NYX_ENCRYPTION_MODE}'"
		exit 1
	fi
fi

exec node server/index.js
