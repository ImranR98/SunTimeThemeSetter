# Lux
Automatically switch between light/dark themes on sunrise/sunset.

Supports:
- GNOME Desktop Environment on Linux.
- Windows 10.
- Mailspring email app on Linux.

## Requirements
Requires Node.js.

## Usage
### Setup desired themes
- GNOME: Change the gnomeLightTheme and gnomeDarkTheme variables in lux.js.
- Mailspring: Change the mailspringLightTheme and mailspringDarkTheme variables in lux.js.
- Windows 10: Nothing to set. There is only one dark/light theme.

Setup `node luxLoop.js` (windows) or `./luxLoop.sh` (linux) to run on startup (using the Windows option on Linux may result in issues when waking from sleep).
