const fork = require('child_process').fork

const sleep = (seconds) => new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000)
})

const forkSync = (module, args) => new Promise((resolve, reject) => {
    fork(module, args).on('exit', resolve).on('close', resolve).on('disconnect', resolve).on('error', reject)
})

const runLuxAndWait = async (seconds) => {
    await forkSync(`${__dirname}/lux.js`)
    await sleep(seconds)
}

const runLuxOnLoop = async (interval = 60) => {
    while (true) await runLuxAndWait(interval)
}

runLuxOnLoop().catch(err => console.log(err))