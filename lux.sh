#!/bin/bash
LIGHTTHEME='Yaru-Red'
DARKTHEME='Yaru-Red-dark'

while [ true ]; do
	node "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"/lux.js "$LIGHTTHEME" "$DARKTHEME"
	sleep 60
done;