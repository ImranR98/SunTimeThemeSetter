// This Node App uses 2 free APIs to get the local sunrise/sunset times, then set a light/dark theme for GNOME/Windows 10 and/or Mailspring.



//==================================
// MODULE IMPORTS
//==================================

const https = require('https')
const childProcess = require('child_process')
const execSync = childProcess.execSync
const fs = require('fs')
const exec = childProcess.exec
const os = require('os')
require('./sun')



//==================================
// VARIABLES
//==================================

// Config. vars.
const config = require('./config')

// Hardcoded vars.
const savedTimesPath = os.homedir() + '/savedSunTimes.json'




//==================================
// HELPER FUNCTIONS
//==================================

// Pause code execution for specified ms
const sleep = (ms) => new Promise((resolve, reject) => { setTimeout(() => { resolve() }, ms) })

// Simple HTTP Get
const simpleHttpGet = (url) => {
	return new Promise((resolve, reject) => {
		https.get(url, (resp) => {
			let data = ''
			// A chunk of data has been recieved.
			resp.on('data', (chunk) => {
				data += chunk
			})
			// The whole response has been received. Print out the result.
			resp.on('end', () => {
				resolve(data)
			})
		}).on("error", (err) => {
			reject(err)
		})
	})
}

// Try simpleHttpGet 3 times in case of failure, with a 5000 ms gap between tries
const simpleHttpGet3Tries = async (url, tried = 1) => {
	try {
		let res = await simpleHttpGet(url)
		return res
	} catch (err) {
		if (tried < 3) {
			await sleep(5000)
			return await simpleHttpGet3Tries(url, ++tried)
		} else {
			throw err
		}
	}
}



//==================================
// DATE/TIME FUNCTIONS
//==================================

// Takes a Date and returns it as an int (hours + minutes)
const getTimeNumberFromDate = (date) => {
	let hr = date.getHours().toString()
	let min = date.getMinutes().toString()
	if (min.length == 1) {
		min = '0' + min
	}
	return Number.parseInt(hr + min)
}

// Use free online APIs to get your IP, then IP-based location, then location based sunrise/sunset times
// Returns an object of { sunrise, sunset, calculatedTime }
// Saves above object to a file if a valid path is given
const getNewSunTimes = async (saveToFilePath = null) => {
	console.log('Getting new Sun Times data...')
	console.log('Getting public IP...')
	let publicIP = await simpleHttpGet3Tries('https://ipinfo.io/ip')
	console.log('Getting location from IP...')
	let IPLocation = JSON.parse(await simpleHttpGet3Tries(`https://freegeoip.app/json/${publicIP}`))
	console.log('Calculating Sun Times from Location...')
	let final = {
		sunrise: getTimeNumberFromDate(new Date().sunrise(IPLocation.latitude, IPLocation.longitude)),
		sunset: getTimeNumberFromDate(new Date().sunset(IPLocation.latitude, IPLocation.longitude)),
		calculatedTime: new Date()
	}
	if (saveToFilePath) {
		fs.writeFileSync(saveToFilePath, JSON.stringify(final, null, '\t'))
		console.log('Sun Times data saved to ' + saveToFilePath)
	}
	return final
}

// Gets the sunrise/sunset times either from a file or the getNewSunTimes function
// If a valid file path is specified for a JSON file for a { sunrise, sunset, calculatedTime } object, the object is used
// If the calculatedTime variable above is older than staleDataHoursLimit hours, getNewSunTimes is used to load new data and replace the existing file
const getSunTimes = async (sunTimesFilePath, staleDataHoursLimit = 24) => {
	let sunTimes = null
	if (sunTimesFilePath) {
		if (fs.existsSync(sunTimesFilePath)) {
			try {
				let data = JSON.parse(fs.readFileSync(sunTimesFilePath))
				if (data.sunrise && data.sunset && data.calculatedTime) {
					sunTimes = data
				} else {
					throw 'Saved Sun Time Data in the file is incomplete.'
				}
			} catch (err) {
				console.log(err)
			}
		} else {
			console.log('Saved Sun Time data does not exist.')
		}
	}
	if (sunTimes) {
		if (((new Date() - new Date(sunTimes.calculatedTime)) / 1000 / 60 / 60) > staleDataHoursLimit) {
			console.log(`Saved Sun Times data is older than ${staleDataHoursLimit} Hours - will get newer Data.`)
			sunTimes = null
		}
	}
	if (!sunTimes) {
		sunTimes = await getNewSunTimes(sunTimesFilePath)
	}
	return sunTimes
}



//==================================
// THEME CHANGE FUNCTIONS
//==================================

// Change the GNOME Shell and App themes. Does nothing if not on Linux (or not using GNOME on Linux).
const changeGNOMETheme = async (theme) => {
	if (os.platform() == 'linux') {
		let currentShellTheme = execSync(`gsettings --schemadir ~/.local/share/gnome-shell/extensions/user-theme@gnome-shell-extensions.gcampax.github.com/schemas/ get org.gnome.shell.extensions.user-theme name`).toString().trim()
		let currentAppTheme = execSync(`gsettings get org.gnome.desktop.interface gtk-theme`).toString().trim()
		let time = new Date()
		if (`'${theme}'` != currentAppTheme) {
			execSync(`gsettings set org.gnome.desktop.interface gtk-theme "${theme}"`)
			console.log(`GNOME App theme ${theme} set at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change GNOME App theme (currently ${theme}).`)
		}
		if (`'${theme}'` != currentShellTheme) {
			await sleep(1000) // Pop!_OS 20.04 Bugifx
			execSync(`gsettings --schemadir ~/.local/share/gnome-shell/extensions/user-theme@gnome-shell-extensions.gcampax.github.com/schemas/ set org.gnome.shell.extensions.user-theme name "${theme}"`)
			console.log(`GNOME Shell theme ${theme} set at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change GNOME Shell theme (currently ${theme}).`)
		}
	}
}

// Change to a Mailspring theme. Does nothing if not on Linux or Windows, or if no Mailspring config. file found.
const changeMailSpringTheme = async (theme) => {
	let configPath = null
	if (os.platform() == 'linux') {
		configPath = os.homedir() + '/.config/Mailspring/config.json'
		if (!fs.existsSync(configPath)) configPath = os.homedir() + '/snap/mailspring/common/config.json' // In case of a Snap install
	} else if (os.platform() == 'win32') {
		configPath = os.homedir() + '/AppData/Roaming/Mailspring/config.json'
	} else {
		throw 'Not on Windows or Linux'
	}
	if (fs.existsSync(configPath)) {
		let mailspringConfig = JSON.parse(fs.readFileSync(configPath).toString())
		if (mailspringConfig) {
			if (mailspringConfig['*']) {
				if (mailspringConfig['*'].core) {
					let time = new Date()
					if (mailspringConfig['*'].core.theme != theme) {
						mailspringConfig['*'].core.theme = theme
						fs.writeFileSync(configPath, JSON.stringify(mailspringConfig, null, '\t'))
						console.log(`Mailspring theme ${theme} set at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
						if (os.platform == 'linux') {
							try {
								execSync('pkill -f mailspring')
							} catch (err) {
								// Try catch needed as this always throws an error
							}
						} else if (os.platform() == 'win32') {
							try {
								execSync('taskkill /F /IM mailspring.exe')
							} catch (err) {
								// Try catch needed as this may throw an error if Mailspring isn't running
							}
						}
						console.log(`Mailspring process killed at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
						if (os.platform() == 'linux') {
							exec('mailspring --background &')
						} else if (os.platform() == 'win32') {
							exec(`${os.homedir()}/AppData/Local/Mailspring/mailspring.exe --background`)
							await sleep(1000) // Without this, process ends before the previous exec can actually run. Can't use execSync as it blocks the process.
						}
						console.log(`Mailspring started in background at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
					} else {
						console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change Mailspring theme (currently ${mailspringConfig['*'].core.theme}).`)
					}
				}
			}
		}
	}
}

// Change between light/dark Windows 10 themes. Does nothing if not on Windows.
const changeWindows10Theme = (dark) => {
	if (os.platform() == 'win32') {
		if (dark)
			execSync(`reg add HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v AppsUseLightTheme /t REG_DWORD /d 0 /f & reg add HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v SystemUsesLightTheme /t REG_DWORD /d 0 /f`)
		else
			execSync(`reg add HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v AppsUseLightTheme /t REG_DWORD /d 1 /f & reg add HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v SystemUsesLightTheme /t REG_DWORD /d 1 /f`)
	}
}



//==================================
// MAIN LOGIC FUNCTIONS
//==================================

// Takes an object of { sunrise, sunset } and uses it to set a dark or light theme
const changeThemesWithSunTimes = async (sunTimes, lightTheme, darkTheme) => {
	let now = getTimeNumberFromDate(new Date())
	let sunrise = sunTimes.sunrise
	let sunset = sunTimes.sunset
	if (now > sunrise && now < sunset) {
		if (config.config.shouldChangeGNOMETheme) await changeGNOMETheme(config.config.gnomeLightTheme)
		if (config.config.shouldChangeWindows10Theme) changeWindows10Theme(false)
		if (config.config.shouldChangeMailspringTheme) await changeMailSpringTheme(config.config.mailspringLightTheme)
	} else {
		if (config.config.shouldChangeGNOMETheme) await changeGNOMETheme(config.config.gnomeDarkTheme)
		if (config.config.shouldChangeWindows10Theme) changeWindows10Theme(true)
		if (config.config.shouldChangeMailspringTheme) await changeMailSpringTheme(config.config.mailspringDarkTheme)
	}
}

// Main function
// Gets the sunrise/sunset times and sets the themes accordingly.
const lux = async () => {
	let sunTimes = await getSunTimes(savedTimesPath, 24)
	await changeThemesWithSunTimes(sunTimes)
}

// Actual run
lux().then(() => {
	console.log('Done')
	process.exit()
}).catch((err) => {
	console.log(err)
	process.exit()
})
