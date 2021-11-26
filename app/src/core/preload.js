const Crawler = require('crawler');
const axios = require('axios');
const workerFarm = require('worker-farm');
const {cpus} = require('os');
const workersLocal = workerFarm({maxConcurrentWorkers: 1, maxConcurrentCallsPerWorker: 1}, require.resolve('./local'));
const workersRemote = workerFarm({
    maxConcurrentWorkers: 2,
    maxConcurrentCallsPerWorker: 1
}, require.resolve('./remote'));
const fs = require('fs');

let origin, started = false, lite = false, total, agent = 'Speed & W3C checker 3.0', updater, tries, stats = {};
let c = new Crawler({
    maxConnections: cpus().length,
    strictSSL: false,
    time: true,
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else if (res.statusCode === 200) {
            let current = total + 1;

            if (res.options.uri.includes('sitemap') && res.headers['content-type'].includes('xml')) { // sitemap xml
                let xml = res.body.matchAll(/<loc>(.*?)<\/loc>/g);

                if (!res.options.uri.includes('index') && lite) {
                    Array.from(xml).forEach(function (element, key) {
                        if (key < 2) {
                            c.queue([{uri: element[1], jQuery: false, followRedirect: false, userAgent: agent}]);
                        }
                    });
                } else { // unlimited
                    Array.from(xml).forEach(function (element) {
                        c.queue([{uri: element[1], jQuery: false, followRedirect: false, userAgent: agent}]);
                    });
                }
            } else if (res.options.uri.includes(origin.host) && !res.options.uri.includes('amp') && res.headers['content-type'].includes('html')) { // only for inner links and only html pages
                $('table tbody').append('<tr data-id="' + current + '"><td>' + current + '</td><td><span class="link">' + res.options.uri + '</span><span class="action-controls"></span></td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>');

                ++total;

                htmlValidate(res.body, current);
            }
        }

        done();
    }
});

window.messageList = {};
window.queue = [];
window.start = function (urls) {
    if (started) {
        return;
    }

    lite = !document.querySelector('#lite-mode').checked;
    urls = urls.split(',');

    origin = new URL(urls[0].trim());
    started = true;

    if (updater !== undefined) {
        clearInterval(updater);
    }

    updater = setInterval(tick, 1000);

    $('table tbody').html('');
    total = 0;
    tries = 0;

    urls.forEach(url => {
        c.queue([{uri: url.trim(), jQuery: false, followRedirect: false, userAgent: agent}]);
    });

    $('#export').prop('disabled', false);
    setStatus('collecting links');
}

window.export = function () {
    if (!fs.existsSync(__dirname + '/../output/')) {
        fs.mkdirSync(__dirname + '/../output/');
    }

    fs.readFile(__dirname + '/../html/template.html', 'utf-8', function (err, data) {
        if (err) throw err;

        fs.writeFile(__dirname + '/../output/' + origin.host + '.html', data.replace('{table_content}', $('table').html()), 'utf-8', function (err) {
            if (err) throw err;

            openDir(__dirname + '/../output/');
        });
    });
}

window.refresh = function (url, position) {
    lighthouseCheck(url, position);
}

function fillRow(position, score, audits) {
    let color = score >= 90 ? '#0cce6b' : score >= 50 ? '#ffa400' : '#ff4e42';

    $('table tbody tr[data-id="' + position + '"] td:eq(3)').css('background-color', color).html(score);
    $('table tbody tr[data-id="' + position + '"] td:eq(4)').css('background-color', getLighthouseColor('fcp', audits["first-contentful-paint"].numericValue)).html(audits["first-contentful-paint"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(5)').css('background-color', getLighthouseColor('si', audits["speed-index"].numericValue)).html(audits["speed-index"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(6)').css('background-color', getLighthouseColor('lcp', audits["largest-contentful-paint"].numericValue)).html(audits["largest-contentful-paint"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(7)').css('background-color', getLighthouseColor('tit', audits["interactive"].numericValue)).html(audits["interactive"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(8)').css('background-color', getLighthouseColor('tbt', audits["total-blocking-time"].numericValue)).html(audits["total-blocking-time"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(9)').css('background-color', getLighthouseColor('cls', audits["cumulative-layout-shift"].numericValue)).html(audits["cumulative-layout-shift"].displayValue);
    $('table tbody tr[data-id="' + position + '"] td:eq(10)').css('background-color', getLighthouseColor('ttfb', audits["server-response-time"].numericValue)).html(parseInt(audits["server-response-time"].numericValue) + " ms");

    queue.splice(queue.indexOf(position), 1);
    updateStats(position, audits);
}

function lighthouseCheck(url, position) {
    let disabledAPI = document.querySelector('#api-enable').checked;

    if (queue.includes(position)) {
        return false;
    }

    if (origin.host.includes('devshell.site') || disabledAPI) {
        workersLocal(url, function (result) {
            fillRow(position, result.lhr.categories.performance.score * 100, result.lhr.audits);
        });
    } else {
        workersRemote(url, getApikey(), function (data) {
            fillRow(position, data.lighthouseResult.categories.performance.score * 100, data.lighthouseResult.audits);
        });
    }

    queue.push(position);
}

function htmlValidate(body, current) {
    axios.post('http://127.0.0.1:8888/?out=json', body, {
        headers: {'Content-Type': 'text/html; charset=utf-8'}
    }).then(function (response) {
        let errors = 0, warnings = 0, element = $('table tbody tr[data-id="' + current + '"] td:eq(2)');

        $.each(response.data.messages, function (k, v) {
            if (v.type === 'error') {
                errors++;
                messageList[current] = response.data.messages;
            } else if (v.type === 'warning' || v.subType === 'warning') {
                warnings++;
            }
        });

        element.css('background-color', errors === 0 ? '#0cce6b' : '#ff4e42');
        element.css('color', 'white');

        if (errors || warnings) {
            element.css('cursor', 'pointer');
        }

        element.text(errors + ' errors, ' + warnings + ' warnings');
    }).catch(function (error) {
        console.log(error);
    });
}

function getLighthouseColor(param, value) {
    let limits = {
        fcp: {green: 1820, orange: 3010},
        si: {green: 3420, orange: 5830},
        lcp: {green: 2250, orange: 4010},
        tit: {green: 3830, orange: 7340},
        tbt: {green: 200, orange: 600},
        cls: {green: 0.1, orange: 0.25},
        ttfb: {green: 200, orange: 400},
    };

    return limits[param] !== undefined ? value < limits[param].green ? '#0cce6b' : (value < limits[param].orange ? '#ffa400' : '#ff4e42') : 'initial';
}

function setStatus(text) {
    document.querySelector('.status span').textContent = text
}

function tick() {
    if (tries < 3 && c.queueSize === 0 && ++tries === 3) {
        setStatus('resting');

        setTimeout(() => {
            setStatus('checking the speed');

            document.querySelectorAll('tbody tr').forEach((el, i) => {
                lighthouseCheck(el.querySelectorAll('td')[1].textContent, ++i);
            });
        }, 10000);
    }
}

function getApikey() {
    let keys = ['AIzaSyAgBrOaPw6MfacCHhtrxi1Vqk5aL1omtls', 'AIzaSyCDMs9Go-ljypDLABs9LwiTEJIRPjtN6mM', 'AIzaSyCkExvwDR51GQwGoWaTDl1Z97QKwtADFnk', 'AIzaSyBaNM7GrUbPhqpnTNFN_8CI4hNR36NYIns'];

    return keys[Math.floor(Math.random() * keys.length)]; // temp decision
}

function openDir(path) {
    let cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

    require('child_process').exec(cmd + ' ' + path);
}

function updateStats(position, audits) {
    let items = ['render-blocking-resources', 'uses-responsive-images', 'offscreen-images', 'uses-optimized-images',
        'modern-image-formats', 'unminified-css', 'unminified-javascript', 'unused-css-rules', 'unused-javascript',
        'duplicated-javascript', 'legacy-javascript', 'uses-text-compression', 'uses-rel-preconnect',
        'server-response-time', 'redirects', 'uses-rel-preload', 'efficient-animated-content', 'preload-lcp-image',
        'total-byte-weight', 'uses-long-cache-ttl', 'dom-size', 'mainthread-work-breakdown', 'long-tasks',
        'bootup-time', 'unsized-images', 'font-display', 'no-document-write', 'third-party-summary',
        'third-party-facades', 'layout-shift-elements', 'non-composited-animations'];

    items.forEach(item => pushToStats(position, audits[item]));
}

function pushToStats(position, audit) {
    if (stats[audit.id] === undefined) {
        stats[audit.id] = {id: audit.id, title: audit.title, score: 0, position: []};
    }

    if ((audit.score === null || audit.score <= 0.9) && audit.details !== undefined && audit.details.items.length !== 0) {
        stats[audit.id].score += 1;
        stats[audit.id].position.push(position);
    }

    drawStats();
}

function drawStats() {
    let points = document.querySelector('.points');

    for (let id in stats) {
        let point = document.querySelector('#' + id), score = stats[id].score;

        if (point) {
            point.classList.remove('warning', 'error');

            if (score > 0) {
                point.classList.add(score >= 10 ? 'error' : 'warning');
            }

            point.querySelector('.point-score').textContent = score;
        } else {
            let point = document.createElement('div');

            point.classList.add('point');
            point.id = id;
            point.innerHTML = '<div class="point-title">' + stats[id].title + '</div><div class="point-score">' + score + '</div>';

            if (score > 0) {
                point.classList.add('warning');
            }

            points.appendChild(point);
        }
    }
}