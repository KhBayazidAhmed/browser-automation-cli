#!/bin/sh

set -eu

repository="${BFLOW_REPOSITORY:-KhBayazidAhmed/browser-automation-cli}"
requested_version="${BFLOW_VERSION:-latest}"
install_dir="${BFLOW_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
	printf 'bflow installer: %s\n' "$1" >&2
	exit 1
}

download() {
	url="$1"
	destination="$2"
	if command -v curl >/dev/null 2>&1; then
		curl --fail --silent --show-error --location "$url" --output "$destination"
	elif command -v wget >/dev/null 2>&1; then
		wget --quiet "$url" --output-document "$destination"
	else
		fail "curl or wget is required"
	fi
}

case "$(uname -s)" in
	Darwin) operating_system="darwin" ;;
	Linux) operating_system="linux" ;;
	*) fail "unsupported operating system: $(uname -s)" ;;
esac

case "$(uname -m)" in
	x86_64 | amd64) architecture="x64" ;;
	arm64 | aarch64) architecture="arm64" ;;
	*) fail "unsupported CPU architecture: $(uname -m)" ;;
esac

platform="${operating_system}-${architecture}"
if [ "$operating_system" = "linux" ]; then
	if [ -f /etc/alpine-release ] || (ldd --version 2>&1 | grep -qi musl); then
		platform="${platform}-musl"
	fi
fi

asset="bflow-${platform}.tar.gz"
if [ "$requested_version" = "latest" ]; then
	release_url="https://github.com/${repository}/releases/latest/download"
else
	case "$requested_version" in
		v*) release_tag="$requested_version" ;;
		*) release_tag="v${requested_version}" ;;
	esac
	release_url="https://github.com/${repository}/releases/download/${release_tag}"
fi

temporary_dir="$(mktemp -d 2>/dev/null || mktemp -d -t bflow)"
trap 'rm -rf "$temporary_dir"' EXIT INT TERM

printf 'Downloading %s...\n' "$asset"
download "${release_url}/${asset}" "${temporary_dir}/${asset}"
download "${release_url}/SHA256SUMS" "${temporary_dir}/SHA256SUMS"

expected_checksum="$(awk -v asset="$asset" '$2 == asset { print $1; exit }' "${temporary_dir}/SHA256SUMS")"
[ -n "$expected_checksum" ] || fail "checksum for ${asset} was not published"

if command -v sha256sum >/dev/null 2>&1; then
	actual_checksum="$(sha256sum "${temporary_dir}/${asset}" | awk '{ print $1 }')"
elif command -v shasum >/dev/null 2>&1; then
	actual_checksum="$(shasum -a 256 "${temporary_dir}/${asset}" | awk '{ print $1 }')"
else
	fail "sha256sum or shasum is required to verify the download"
fi

[ "$expected_checksum" = "$actual_checksum" ] || fail "checksum verification failed"

tar -xzf "${temporary_dir}/${asset}" -C "$temporary_dir"
[ -f "${temporary_dir}/bflow" ] || fail "release archive is missing the executable"

mkdir -p "$install_dir"
temporary_binary="${install_dir}/.bflow.$$"
cp "${temporary_dir}/bflow" "$temporary_binary"
chmod 755 "$temporary_binary"
mv "$temporary_binary" "${install_dir}/bflow"

case ":${PATH:-}:" in
	*":${install_dir}:"*) path_ready=true ;;
	*) path_ready=false ;;
esac

if [ "$path_ready" = "false" ]; then
	case "${SHELL:-}" in
		*/zsh) shell_config="$HOME/.zshrc" ;;
		*/bash) shell_config="$HOME/.bashrc" ;;
		*) shell_config="$HOME/.profile" ;;
	esac
	path_line="export PATH=\"${install_dir}:\$PATH\""
	if [ ! -f "$shell_config" ] || ! grep -F "$path_line" "$shell_config" >/dev/null 2>&1; then
		printf '\n# bflow CLI\n%s\n' "$path_line" >>"$shell_config"
	fi
fi

installed_version="$(${install_dir}/bflow --version)"
printf '\nInstalled %s at %s/bflow\n' "$installed_version" "$install_dir"
if [ "$path_ready" = "false" ]; then
	printf 'Open a new terminal, then run: bflow\n'
else
	printf 'Run: bflow\n'
fi
