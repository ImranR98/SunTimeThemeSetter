#!/bin/bash
LIGHTTHEME='Yaru-Red'
DARKTHEME='Yaru-Red-dark'

FILESFOLDER=~/STTS-Files # If you change this, change it in the .js too.
if [ -d "$FILESFOLDER" ]
then
			echo "Creating Files folder..."
			mkdir ~/STTS-Files
fi

while [ true ]; do
	node "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"/SunTimeThemeSetter.js "$LIGHTTHEME" "$DARKTHEME" &> ~/STTS-Files/STTSLastActionLog.txt
	sleep 60
done;
