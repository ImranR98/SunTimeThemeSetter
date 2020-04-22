#!/bin/bash
FILESFOLDER="$(ls ~ | grep "^STTS-Files$")"
if [ -z "$FILESFOLDER" ]
then
			echo "Creating Files folder..."
			mkdir ~/STTS-Files
fi

while [ true ]; do node "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"/SunTimeThemeSetter.js Yaru-Red Yaru-Red-dark &> ~/STTS-Files/STTSLastActionLog.txt; sleep 60; done;
