let report = document.querySelector('.general-report-window'),
    title = document.querySelector('.general-report-title'),
    x = 0, y = 0, mousedown = false;

title.addEventListener('mousedown', function (e) {
    mousedown = true;
    x = report.offsetLeft - e.clientX;
    y = report.offsetTop - e.clientY;
}, true);

title.addEventListener('mouseup', function (e) {
    mousedown = false;
});

document.querySelector('body').addEventListener('mousemove', function (e) {
    mousedown = false;
});

title.addEventListener('mousemove', function (e) {
    if (mousedown) {
        let newX = e.clientX + x, newY = e.clientY + y;

        if (newX > 10 && newX < window.innerWidth - report.offsetWidth - 10) {
            report.style.left = newX + 'px';
        }

        if (newY > -190 && newY < 130) {
            report.style.top = newY + 'px';
        }
    }
    e.stopPropagation();
}, true);

document.querySelector('.settings').addEventListener('click', () => {
    document.querySelector('aside').classList.toggle('opened');
});

document.querySelector('.start').addEventListener('click', () => {
    window.start(document.querySelector('#urls').value);
    document.querySelector('.general-report-minimized').classList.toggle('hide');
});

document.querySelector('.export').addEventListener('click', () => {
    window.export();
});

document.querySelector('.exit').addEventListener('click', () => {
    window.close();
});

document.querySelector('.rescan').addEventListener('click', () => {
    document.querySelectorAll('tbody tr').forEach(el => {
        let warnings = 0;

        el.querySelectorAll('td').forEach((td, index) => {
            if (index > 2 && td.style.backgroundColor !== 'rgb(12, 206, 107)') {
                td.textContent = '-';
                td.style.backgroundColor = 'unset';
                warnings++;
            }
        });

        if (warnings > 0) {
            window.refresh(el.querySelector('td:nth-child(2)').textContent, el.getAttribute('data-id'))
        }
    });
});

document.querySelectorAll('.minimize, .general-report-minimized').forEach(el => {
    el.addEventListener('click', e => {
        document.querySelector('.general-report-window').classList.toggle('show');
        document.querySelector('.general-report-minimized').classList.toggle('hide');
    });
});