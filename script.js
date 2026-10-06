const CLOCK_API_URL = 'https://worldtimeapi.org/api/ip';
const CLOCK_SYNC_TIMEOUT_MS = 8000;

async function initializeClock() {
    const clockElement = document.querySelector('#liveClock');

    if (!clockElement) {
        console.error('No se encontró el elemento del reloj (#liveClock).');
        return;
    }

    let timeOffset = 0;

    function renderClock() {
        const now = new Date(Date.now() + timeOffset);
        clockElement.textContent = new Intl.DateTimeFormat('es', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(now);
        clockElement.dateTime = now.toISOString();
    }

    renderClock();
    window.setInterval(renderClock, 1000);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        CLOCK_SYNC_TIMEOUT_MS
    );

    try {
        const response = await fetch(CLOCK_API_URL, {
            signal: controller.signal,
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`WorldTimeAPI respondió con estado ${response.status}.`);
        }

        const data = await response.json();
        const apiDate = new Date(data.datetime);

        if (Number.isNaN(apiDate.getTime())) {
            throw new Error('WorldTimeAPI devolvió una fecha no válida.');
        }

        timeOffset = apiDate.getTime() - Date.now();
        renderClock();
    } catch (error) {
        console.warn(
            'No se pudo sincronizar la hora; se mantendrá la hora del dispositivo.',
            error
        );
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function initializeDesktopEffects() {
    const stage = document.querySelector('.desktop-stage');
    const phone = document.querySelector('.phone-canvas');

    if (!stage || !phone) {
        console.error('No se encontraron los elementos necesarios para los efectos de escritorio.');
        return;
    }

    window.requestAnimationFrame(() => {
        stage.classList.add('is-loaded');
    });

    const desktopPointer = window.matchMedia(
        '(min-width: 640px) and (hover: hover) and (pointer: fine)'
    );
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!desktopPointer.matches || reducedMotion.matches) {
        return;
    }

    let frameId = 0;

    function resetTilt() {
        window.cancelAnimationFrame(frameId);
        phone.classList.remove('is-tilting');
        phone.style.removeProperty('--rotate-x');
        phone.style.removeProperty('--rotate-y');
        phone.style.removeProperty('--shift-x');
        phone.style.removeProperty('--shift-y');
    }

    phone.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') {
            return;
        }

        const bounds = phone.getBoundingClientRect();
        const horizontalPosition = (event.clientX - bounds.left) / bounds.width;
        const verticalPosition = (event.clientY - bounds.top) / bounds.height;
        const rotateY = (horizontalPosition - 0.5) * 10;
        const rotateX = (0.5 - verticalPosition) * 8;
        const shiftX = (horizontalPosition - 0.5) * 5;
        const shiftY = (verticalPosition - 0.5) * 5;

        window.cancelAnimationFrame(frameId);
        frameId = window.requestAnimationFrame(() => {
            phone.classList.add('is-tilting');
            phone.style.setProperty('--rotate-x', `${rotateX.toFixed(2)}deg`);
            phone.style.setProperty('--rotate-y', `${rotateY.toFixed(2)}deg`);
            phone.style.setProperty('--shift-x', `${shiftX.toFixed(2)}px`);
            phone.style.setProperty('--shift-y', `${shiftY.toFixed(2)}px`);
        });
    });

    phone.addEventListener('pointerleave', resetTilt);
}

initializeClock();
initializeDesktopEffects();
