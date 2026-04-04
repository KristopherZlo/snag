const REAL_CAPTURE_CONSTRAINTS = {
    video: {
        frameRate: { ideal: 1, max: 1 },
    },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
};

function waitForVideoMetadata(video) {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
        };

        const onLoadedMetadata = () => {
            cleanup();
            resolve();
        };

        const onError = () => {
            cleanup();
            reject(new Error('Direct screenshot metadata could not be loaded.'));
        };

        if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
        }

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onError, { once: true });
    });
}

function waitForSettledFrame(video) {
    return new Promise((resolve) => {
        if (typeof video.requestVideoFrameCallback === 'function') {
            video.requestVideoFrameCallback(() => resolve());
            return;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob instanceof Blob) {
                resolve(blob);
                return;
            }

            reject(new Error('Failed to create the direct screenshot.'));
        }, 'image/png');
    });
}

function stopStream(stream) {
    stream?.getTracks?.().forEach((track) => {
        track.stop();
    });
}

function isLocalhostHostname(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function getRealPageCaptureSupport(environment = {}) {
    const view = environment.window ?? (typeof window !== 'undefined' ? window : null);
    const nav = environment.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);

    if (!view || !nav) {
        return { supported: false, reason: 'unsupported_browser' };
    }

    const secureContext = view.isSecureContext || isLocalhostHostname(view.location.hostname);

    if (!secureContext) {
        return { supported: false, reason: 'insecure_context' };
    }

    if (typeof nav.mediaDevices?.getDisplayMedia !== 'function') {
        return { supported: false, reason: 'unsupported_browser' };
    }

    return { supported: true, reason: null };
}

export async function captureRealPageScreenshot(options = {}) {
    const support = getRealPageCaptureSupport();

    if (!support.supported) {
        throw new Error(support.reason);
    }

    const excludeElement = options.excludeElement instanceof HTMLElement ? options.excludeElement : null;
    const previousVisibility = excludeElement?.style.visibility ?? '';
    const previousPointerEvents = excludeElement?.style.pointerEvents ?? '';
    let stream = null;
    let video = null;

    if (excludeElement) {
        excludeElement.style.visibility = 'hidden';
        excludeElement.style.pointerEvents = 'none';
    }

    try {
        stream = await navigator.mediaDevices.getDisplayMedia(REAL_CAPTURE_CONSTRAINTS);

        const [videoTrack] = stream.getVideoTracks();

        if (!videoTrack) {
            throw new Error('missing_video_track');
        }

        const settings = videoTrack.getSettings?.() ?? {};

        if (settings.displaySurface && settings.displaySurface !== 'browser') {
            throw new Error('wrong_surface');
        }

        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await waitForVideoMetadata(video);
        await video.play();
        await waitForSettledFrame(video);

        const width = video.videoWidth || window.innerWidth || 1;
        const height = video.videoHeight || window.innerHeight || 1;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
            throw new Error('missing_canvas_context');
        }

        context.drawImage(video, 0, 0, width, height);

        return await canvasToBlob(canvas);
    } finally {
        if (video) {
            video.pause();
            video.srcObject = null;
        }

        stopStream(stream);

        if (excludeElement) {
            excludeElement.style.visibility = previousVisibility;
            excludeElement.style.pointerEvents = previousPointerEvents;
        }
    }
}
