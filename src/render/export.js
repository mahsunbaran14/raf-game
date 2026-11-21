// Dev-only telemetry export (brief §6.1): a JSON download button that only
// exists when the page URL contains "debug". No network calls.
const LABEL = 'Export';
const MIME = 'application/json';
const BUTTON_STYLE =
  'position:fixed;left:8px;bottom:8px;padding:4px 8px;font-size:12px;';

export const TELEMETRY_FILE = 'raf-telemetry.json';

export function isDebugSearch(search) {
  return typeof search === 'string' && search.includes('debug');
}

function downloadTelemetry(telemetry, env) {
  const doc = env.document ?? globalThis.document;
  const BlobCtor = env.Blob ?? globalThis.Blob;
  const urlApi = env.URL ?? globalThis.URL;
  const blob = new BlobCtor([telemetry.toJSON()], { type: MIME });
  const url = urlApi.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = TELEMETRY_FILE;
  link.click();
  urlApi.revokeObjectURL(url);
}

export function createExportButton(telemetry, container, env = {}) {
  const doc = env.document ?? globalThis.document;
  const location = env.location ?? globalThis.location;
  if (!doc || !container || !isDebugSearch(location?.search)) return null;

  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = LABEL;
  button.setAttribute('data-testid', 'telemetry-export');
  button.setAttribute('style', BUTTON_STYLE);
  button.addEventListener('click', (event) => {
    event?.preventDefault?.();
    downloadTelemetry(telemetry, env);
  });
  container.appendChild(button);
  return button;
}
