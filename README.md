# Lux
Automatically switch between light/dark themes on sunrise/sunset.

Supports:
- GNOME Desktop Environment on Linux (with wallpaper switching support).
- Windows 10.
- Mailspring email app **( will close without warning while theme is changed )**.

## Requirements
Requires Node.js.

## Usage
### Setup Themes
Rename config.template.js to config.js, then change the variables in it to whatever you need.

### Prepare OS
If on Linux using GNOME, make sure to install the [GNOME Tweak tool](https://wiki.gnome.org/action/show/Apps/Tweaks?action=show&redirect=Apps%2FGnomeTweakTool) and enable the [User Themes extension](https://extensions.gnome.org/extension/19/user-themes/).

### Run on Startup
Setup `node luxLoop.js` to run on startup.

On Windows, this is done by creating a new shortcut in 'C:\Users\YourName\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup' with the 
target set to 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -command "Start-Process -WindowStyle hidden -FilePath node ...\Path\To\Lux\luxLoop.js"' and 
the 'start in' set to 'C:\Windows\System32\WindowsPowerShell\v1.0'.

On Linux running GNOME, this is done by creating the appropriate .desktop file in ~/.config/autostart.
