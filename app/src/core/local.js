const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

module.exports = function (url, callback) {
    (async () => {
        const chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless']
        }).catch(function (error) {
            console.log('Chrome launcher error', error);
        });

        if (chrome !== undefined && chrome !== null) {
            const runnerResult = await lighthouse(url, {
                maxWaitForLoad: 35000,
                maxWaitForFcp: 15000,
                onlyCategories: ['performance'],
                onlyAudits: ['metrics/first-contentful-paint', 'metrics/speed-index', 'metrics/largest-contentful-paint', 'metrics/interactive', 'metrics/total-blocking-time', 'metrics/cumulative-layout-shift'],
                port: chrome.port,
            }).catch(function (error) {
                console.log('Lighthouse error:', error)
            });

            chrome.kill().then(() => {
                callback(runnerResult);
            }).catch(function (error) {
                console.log(error);
            });
        }
    })();
}