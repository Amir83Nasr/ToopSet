#!/bin/sh
set -e

ARCH=$(uname -m)
case "$ARCH" in
    aarch64|arm64) NODE_ARCH=arm64 ;;
    *) NODE_ARCH=x64 ;;
esac

NODE_URL="https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-${NODE_ARCH}.tar.gz"
echo "Downloading $NODE_URL ..."

python3 -c "from urllib.request import urlretrieve; urlretrieve('$NODE_URL', '/tmp/node.tar.gz')"
echo "Download complete, extracting ..."

tar -xzf /tmp/node.tar.gz -C /usr/local --strip-components=1
echo "Extraction complete"

rm /tmp/node.tar.gz

export PATH="/usr/local/bin:$PATH"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
