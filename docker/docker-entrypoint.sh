#!/bin/sh
set -eu

data_directory="${DATABASE_URL:-/data/car-log.db}"
case "$data_directory" in
	/*) ;;
	*)
		echo "Refusing non-absolute DATABASE_URL: $data_directory" >&2
		exit 1
		;;
esac
if [ "$data_directory" = "/" ]; then
	echo "Refusing unsafe DATABASE_URL: $data_directory" >&2
	exit 1
fi

mkdir -p "$(dirname "$data_directory")"
touch "$data_directory"
chown bun:bun "$(dirname "$data_directory")" "$data_directory"

mkdir -p /app/uploads
chown bun:bun /app/uploads

exec setpriv --reuid=bun --regid=bun --init-groups bun build/index.js
