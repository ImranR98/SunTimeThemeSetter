// This Node App uses 3 free APIs to get the local sunrise/sunset times, then sets a light/dark gnome-theme.
// If a Mailspring folder exists in the current User's ~/.config then the *.core.theme property in config.json is changed accordingly (ui-light or ui-dark)
// Mailspring themes are hardcoded for now

const https = require('https')
const bashSync = require('child_process').execSync
const fs = require('fs')
const bash = require('child_process').exec

// Hardcoded vars.
const savedTimesPath = '/home/' + bash('whoami').toString().trim() + '/STTS-Files/savedSunTimes.json'
const lastSetThemesPath = '/home/' + bash('whoami').toString().trim() + '/STTS-Files/lastSetThemes.json'
const mailSpringDarkTheme = 'ui-dark';
const mailSpringLightTheme = 'ui-light';

// Pause code execution for specified ms
let sleep = (ms) => new Promise((resolve, reject) => { setTimeout(() => { resolve() }, ms) })

// Simple HTTP Get
let simpleHttpGet = (url) => {
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
let simpleHttpGet3Tries = async (url, tried = 1) => {
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

// Use free online APIs to get your IP, then IP-based location, then location based sunrise/sunset times
// Returns an object of { sunrise, sunset, time }
// Saves above object to a file if a valid path is given
let getNewSunTimes = async (saveToFilePath = null) => {
	console.log('Getting new Sun Times data...')
	console.log('Getting public IP...')
	let publicIP = await simpleHttpGet3Tries('https://ipinfo.io/ip')
	console.log('Getting location from IP...')
	let IPLocation = JSON.parse(await simpleHttpGet3Tries(`https://ipvigilante.com/${publicIP}`)).data
	console.log('Getting Sun Times from Location...')
	let { sunrise, sunset } = JSON.parse(await simpleHttpGet3Tries(`https://api.sunrise-sunset.org/json?lat=${IPLocation.latitude}&lng=${IPLocation.longitude}`)).results
	let final = {
		sunrise: sunrise,
		sunset: sunset,
		time: new Date()
	}
	if (saveToFilePath) {
		fs.writeFileSync(saveToFilePath, JSON.stringify(final, null, '\t'))
		console.log('Sun Times data saved to ' + saveToFilePath)
	}
	return final
}

// Gets the sunrise/sunset times either from a file or the getNewSunTimes function
// If a valid file path is specified for a JSON file for a { sunrise, sunset, time } object, the object is used
// If the time variable above is older than staleDataHoursLimit hours, getNewSunTimes is used to load new data and replace the existing file
let getSunTimes = async (sunTimesFilePath, staleDataHoursLimit = 24) => {
	let sunTimes = null
	if (sunTimesFilePath) {
		if (fs.existsSync(sunTimesFilePath)) {
			try {
				let data = JSON.parse(fs.readFileSync(sunTimesFilePath))
				if (data.sunrise && data.sunset && data.time) {
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
		if (((new Date() - new Date(sunTimes.time)) / 1000 / 60 / 60) > staleDataHoursLimit) {
			console.log(`Saved Sun Times data is older than ${staleDataHoursLimit} Hours - will get newer Data.`)
			sunTimes = null
		}
	}
	if (!sunTimes) {
		sunTimes = await getNewSunTimes(sunTimesFilePath)
	}
	return sunTimes
}

let getLastSetThemes = async (lastSetThemesPath) => {
	let lastSetThemes = {
		gnome: null,
		mailspring: null
	}
	if (lastSetThemesPath) {
		if (fs.existsSync(lastSetThemesPath)) {
			try {
				let data = JSON.parse(fs.readFileSync(lastSetThemesPath))
				if (data.gnome) {
					lastSetThemes.gnome = data.gnome
				}
				if (data.mailspring) {
					lastSetThemes.mailspring = data.mailspring
				}
			} catch (err) {
				console.log(err)
			}
		} else {
			console.log('Last set themes file does not exist.')
		}
	}
	return lastSetThemes
}

// Change the gnome theme
let changeGNOMETheme = (theme) => {
	bashSync(`gsettings set org.gnome.shell.extensions.user-theme name "${theme}"; gsettings set org.gnome.desktop.interface gtk-theme "${theme}"`)
	let time = new Date()
	console.log(`GNOME Theme ${theme} set at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
}

// If a Mailspring folder exists in the current User's ~/.config, then the *.core.theme property in config.json is changed to the theme provided
let changeMailSpringTheme = (theme) => {
	let username = bashSync('whoami').toString().trim()
	if (fs.existsSync(`/home/${username}/.config/Mailspring/config.json`)) {
		let mailspringConfig = JSON.parse(fs.readFileSync(`/home/${username}/.config/Mailspring/config.json`).toString())
		if (mailspringConfig) {
			if (mailspringConfig['*']) {
				if (mailspringConfig['*'].core) {
					mailspringConfig['*'].core.theme = theme
					fs.writeFileSync(`/home/${username}/.config/Mailspring/config.json`, JSON.stringify(mailspringConfig, null, '\t'))
					let time = new Date()
					console.log(`Mailspring Theme ${theme} set at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
					try {
						bashSync('pkill -f mailspring')
					} catch (err) {
						// Try catch needed as this always throws an error
					}
					console.log(`Mailspring process killed at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
					bash('mailspring --background &')
					console.log(`Mailspring started in background at ${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()}.`)
				}
			}
		}
	}
}

// Takes an object of { sunrise, sunset } and uses it to set a dark or light theme
let changeThemesWithSunTimes = (sunTimes, lastSetThemes, lightTheme, darkTheme) => {
	let now = getCurrentTimeNumber()
	let sunrise = convertTimeStringToNumber(sunTimes.sunrise, true)
	let sunset = convertTimeStringToNumber(sunTimes.sunset, true)
	let time = new Date()
	if (now > sunrise && now < sunset) {
		if (lightTheme != lastSetThemes.gnome) {
			lastSetThemes.gnome = lightTheme
			changeGNOMETheme(lightTheme)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change GNOME theme (currently ${lastSetThemes.gnome}).`)
		}
		if (mailSpringLightTheme != lastSetThemes.mailspring) {
			lastSetThemes.mailspring = mailSpringLightTheme
			changeMailSpringTheme(mailSpringLightTheme)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change Mailspring theme (currently ${lastSetThemes.mailspring}).`)
		}
	} else {
		if (darkTheme != lastSetThemes.gnome) {
			lastSetThemes.gnome = darkTheme
			changeGNOMETheme(darkTheme)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change GNOME theme (currently ${lastSetThemes.gnome}).`)
		}
		if (mailSpringDarkTheme != lastSetThemes.mailspring) {
			lastSetThemes.mailspring = mailSpringDarkTheme
			changeMailSpringTheme(mailSpringDarkTheme)
		} else {
			console.log(`${time.getHours()}:${time.getMinutes()}:${time.getMilliseconds()} - No need to change Mailspring theme (currently ${lastSetThemes.mailspring}).`)
		}
	}
	fs.writeFileSync(lastSetThemesPath, JSON.stringify(lastSetThemes, null, '\t'))
}

// Takes a time string ('HH:MM PM') and changes it to an int for easy comparison
// If subtractUTCOffset is true, the local time zone offset is accounted for 
let convertTimeStringToNumber = (timeString, subtractUTCOffset = false) => {
	let timeTokens = timeString.trim().split(':')
	timeTokens[0] = Number.parseInt(timeTokens[0])
	if (timeTokens[2].indexOf('PM') != -1) {
		if (timeTokens[0] != 12) {
			timeTokens[0] += 12
		}
	} else {
		if (timeTokens[0] == 12) {
			timeTokens[0] += 0
		}
	}
	if (subtractUTCOffset) {
		timeTokens[0] -= (new Date().getTimezoneOffset() / 60)
	}
	timeTokens[0] = timeTokens[0].toString()
	if (timeTokens[1].length == 1) {
		timeTokens[1] = '0' + timeTokens[1]
	}
	return Number.parseInt(timeTokens[0] + timeTokens[1])
}

// Gets the loca time and returns it as an int (hours + minutes)
let getCurrentTimeNumber = () => {
	let temp = new Date()
	let hr = temp.getHours().toString()
	let min = temp.getMinutes().toString()
	if (min.length == 1) {
		min = '0' + min
	}
	return Number.parseInt(hr + min)
}

// Main logic
// Gets the sunrise/sunset times and sets the Gnome-theme accordingly.
// Themes are from the program arguments (process.argv[2] and process.argv[3])
let run = async () => {
	if (process.argv.length <= 3) {
		throw 'Please provide light and dark theme names as arguments!'
	} else {
		let sunTimes = await getSunTimes(savedTimesPath, 24)
		let lastSetThemes = await getLastSetThemes(lastSetThemesPath)
		changeThemesWithSunTimes(sunTimes, lastSetThemes, process.argv[2], process.argv[3])
	}
}

run().then(() => {
	console.log('Done')
	process.exit()
}).catch((err) => {
	console.log(err)
	process.exit()
})