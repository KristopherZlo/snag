<!doctype html>
<html lang="en">
<head>
    @php($diagnosticsBridgeNonce = (string) \Illuminate\Support\Str::ulid())
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="snag-extension-recorder-nonce" content="{{ $diagnosticsBridgeNonce }}">
    <title>Snag Extension Recorder Diagnostics</title>
    <style>
        :root {
            color-scheme: light;
        }

        body {
            background: #f5efe5;
            color: #2f271d;
            font-family: Inter, "Noto Sans", sans-serif;
            margin: 0;
        }

        main {
            box-sizing: border-box;
            display: grid;
            gap: 18px;
            margin: 0 auto;
            max-width: 920px;
            min-height: 100vh;
            padding: 24px;
        }

        section {
            background: #fffdf9;
            border: 1px solid #d8c8b0;
            border-radius: 18px;
            box-shadow: 0 18px 36px rgba(62, 47, 29, 0.08);
            padding: 20px;
        }

        h1,
        h2 {
            margin: 0 0 8px;
        }

        p {
            color: #6f6559;
            line-height: 1.55;
            margin: 0;
        }

        .controls {
            display: grid;
            gap: 14px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            margin-top: 18px;
        }

        label {
            color: #6f6559;
            display: grid;
            font-size: 12px;
            font-weight: 600;
            gap: 6px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        input {
            background: #fffdf9;
            border: 1px solid #d8c8b0;
            border-radius: 10px;
            box-sizing: border-box;
            color: #2f271d;
            font: inherit;
            min-height: 44px;
            padding: 10px 12px;
            width: 100%;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
        }

        button {
            appearance: none;
            background: #8b5e34;
            border: none;
            border-radius: 10px;
            color: #fffdf9;
            cursor: pointer;
            font: inherit;
            font-weight: 600;
            min-height: 42px;
            padding: 0 16px;
        }

        button[data-variant="secondary"] {
            background: #efe5d5;
            color: #4f4132;
        }

        .status {
            background: #f2eadf;
            border-radius: 12px;
            color: #4f4132;
            margin-top: 18px;
            min-height: 48px;
            padding: 12px 14px;
            white-space: pre-wrap;
        }

        .stack {
            display: grid;
            gap: 12px;
            margin-top: 18px;
        }

        .surface {
            align-items: center;
            background: #faf5ec;
            border: 1px solid #efe5d5;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            padding: 14px;
        }

        .mono {
            font-family: "IBM Plex Mono", Inter, monospace;
        }
    </style>
</head>
<body>
<main>
    <section>
        <h1>Extension recorder diagnostics</h1>
        <p>Use this page as the live target for extension recording smoke tests. It emits stable actions, console entries, fetch/XHR requests, and history navigation so the debugger payload can be verified end to end.</p>

        <div class="controls">
            <label>
                Diagnostic input
                <input id="diagnostic-input" data-testid="diagnostic-input" type="text" placeholder="Type to emit input steps">
            </label>
        </div>

        <div class="actions">
            <button id="start-extension-recording" data-testid="start-extension-recording" type="button">Start extension recording</button>
            <button id="stop-extension-recording" data-testid="stop-extension-recording" data-variant="secondary" type="button">Stop extension recording</button>
            <button id="emit-console" data-testid="emit-console" type="button">Emit console error</button>
            <button id="trigger-fetch" data-testid="trigger-fetch" type="button">Trigger fetch request</button>
            <button id="trigger-xhr" data-testid="trigger-xhr" type="button">Trigger xhr request</button>
            <button id="push-history" data-testid="push-history" data-variant="secondary" type="button">Push history state</button>
        </div>

        <div class="status mono" data-testid="diagnostic-status" id="diagnostic-status">
            Ready for extension recorder smoke tests.
        </div>
    </section>

    <section>
        <h2>Live payload hints</h2>
        <div class="stack">
            <div class="surface">
                <div>Expected action signals</div>
                <div class="mono">click / input / navigation</div>
            </div>
            <div class="surface">
                <div>Expected console signal</div>
                <div class="mono">Recorder smoke console error</div>
            </div>
            <div class="surface">
                <div>Expected network routes</div>
                <div class="mono">{{ route('diagnostics.extension-recorder.ping') }}</div>
            </div>
        </div>
    </section>
</main>

<script>
    (() => {
        const diagnosticsSource = 'snag-extension-recorder-diagnostics';
        const diagnosticsNonce = document
            .querySelector('meta[name="snag-extension-recorder-nonce"]')
            ?.getAttribute('content');
        const status = document.getElementById('diagnostic-status');
        const setStatus = (message) => {
            status.textContent = message;
        };
        const invokeExtensionRuntime = (type) => new Promise((resolve, reject) => {
            if (!diagnosticsNonce) {
                reject(new Error('Diagnostics bridge nonce is missing.'));
                return;
            }

            const responseType = `${type}:response`;
            const timeout = window.setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error('Timed out waiting for the extension runtime response.'));
            }, 15000);

            const handleMessage = (event) => {
                if (event.source !== window || event.origin !== window.location.origin) {
                    return;
                }

                const message = event.data;

                if (!message || message.source !== diagnosticsSource || message.type !== responseType || message.nonce !== diagnosticsNonce) {
                    return;
                }

                window.clearTimeout(timeout);
                window.removeEventListener('message', handleMessage);
                resolve(message.payload ?? { ok: false, message: 'Missing extension response payload.' });
            };

            window.addEventListener('message', handleMessage);
            window.postMessage({ source: diagnosticsSource, type, nonce: diagnosticsNonce }, window.location.origin);
        });

        const pingUrl = @json(route('diagnostics.extension-recorder.ping'));

        document.getElementById('start-extension-recording').addEventListener('click', async () => {
            const response = await invokeExtensionRuntime('start-live-recording');

            if (!response.ok) {
                setStatus(`Extension start failed.\n${response.message ?? 'Unknown error.'}`);
                return;
            }

            setStatus('Extension recorder started from the target tab. Generate actions, console, and network activity, then stop recording.');
        });

        document.getElementById('stop-extension-recording').addEventListener('click', async () => {
            const response = await invokeExtensionRuntime('stop-live-recording');

            if (!response.ok) {
                setStatus(`Extension stop failed.\n${response.message ?? 'Unknown error.'}`);
                return;
            }

            const capture = response.capture ?? {};
            const actions = capture.telemetry?.actions?.length ?? 0;
            const logs = capture.telemetry?.logs?.length ?? 0;
            const network = capture.telemetry?.network_requests?.length ?? 0;

            setStatus(`Extension recorder stopped.\nkind=${capture.kind ?? 'unknown'} bytes=${capture.byteSize ?? 0} steps=${actions} console=${logs} network=${network}`);
        });

        document.getElementById('emit-console').addEventListener('click', () => {
            const message = `Recorder smoke console error @ ${new Date().toISOString()}`;
            console.error(message, { source: 'extension-recorder-diagnostics' });
            setStatus(`Console error emitted.\n${message}`);
        });

        document.getElementById('trigger-fetch').addEventListener('click', async () => {
            const response = await fetch(`${pingUrl}?kind=fetch&tick=${Date.now()}`);
            const payload = await response.json();
            setStatus(`Fetch request finished.\n${JSON.stringify(payload)}`);
        });

        document.getElementById('trigger-xhr').addEventListener('click', () => {
            const request = new XMLHttpRequest();

            request.open('GET', `${pingUrl}?kind=xhr&tick=${Date.now()}`, true);
            request.addEventListener('load', () => {
                setStatus(`XHR request finished.\n${request.responseText}`);
            });
            request.send();
        });

        document.getElementById('push-history').addEventListener('click', () => {
            const value = `step-${Date.now()}`;

            history.pushState({ value }, '', `?step=${value}`);
            document.title = `Recorder smoke ${value}`;
            setStatus(`History updated.\n${window.location.href}`);
        });
    })();
</script>
</body>
</html>
