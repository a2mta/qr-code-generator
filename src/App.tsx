import { useMemo, useState } from 'react';
import QrPreview from './components/QrPreview';
import {
  generateQrCode,
  getInputCapabilities,
  type QrEcc,
  type QrMask,
  type QrMode,
} from './lib-adapters/qr';

const DEFAULT_TEXT = 'https://example.com';
const PNG_SCALE = 16;
const DEFAULT_PNG_SIZE = 512;

function getSvgSize(svg: string): number {
  const match = svg.match(/viewBox="[^"]*\s([\d.]+)\s([\d.]+)"/i);
  if (!match) {
    return DEFAULT_PNG_SIZE;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  const size = Math.max(width, height);

  return Number.isFinite(size) && size > 0 ? size : DEFAULT_PNG_SIZE;
}

async function saveSvgAsPng(svg: string, filename: string): Promise<void> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to render QR image'));
      img.src = svgUrl;
    });

    const size = Math.round(getSvgSize(svg) * PNG_SCALE);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create image canvas');
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, size, size);

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [mode, setMode] = useState<QrMode>('auto');
  const [ecl, setEcl] = useState<QrEcc>('MEDIUM');
  const [minVersion, setMinVersion] = useState(1);
  const [maxVersion, setMaxVersion] = useState(40);
  const [mask, setMask] = useState<QrMask>('auto');
  const [boostEcl, setBoostEcl] = useState(true);

  const caps = useMemo(() => getInputCapabilities(text), [text]);

  const result = useMemo(() => {
    try {
      return {
        data: generateQrCode({
          text,
          mode,
          ecl,
          minVersion,
          maxVersion,
          mask,
          boostEcl,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to generate QR',
      };
    }
  }, [boostEcl, ecl, mask, maxVersion, minVersion, mode, text]);

  const handleSavePng = async () => {
    if (!result.data) {
      return;
    }

    try {
      await saveSvgAsPng(result.data.svg, 'qr-code.png');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save QR code image';
      window.alert(message);
    }
  };

  const panelClass =
    'rounded-[14px] border border-[#ddd2be] bg-white p-5 shadow-[0_8px_20px_rgba(58,44,14,0.08)]';
  const labelClass = 'mb-1.5 block font-semibold';
  const fieldClass =
    'w-full rounded-lg border border-[#c7b89f] bg-white p-2.5 outline-none transition focus:border-[#8f7b55] focus:ring-2 focus:ring-[#e8dac0]';

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#f7f3eb_0%,#ebf3ef_100%)]">
      <main className="mx-auto grid w-[min(1040px,92vw)] grid-cols-1 gap-4 py-8 font-['IBM_Plex_Sans','Segoe_UI',sans-serif] text-[#161414] md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <section className={panelClass}>
          <h1 className="mb-2 text-3xl font-bold leading-tight">QR Generator MVP</h1>
          <label htmlFor="qr-input" className={labelClass}>
            Content
          </label>
          <textarea
            id="qr-input"
            className={`${fieldClass} resize-y`}
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Enter text, URL, digits, etc."
          />

          <div className="mt-2 flex gap-4 text-sm text-[#6a624f]">
            <span>Numeric: {caps.isNumeric ? 'yes' : 'no'}</span>
            <span>Alphanumeric: {caps.isAlphanumeric ? 'yes' : 'no'}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="mode" className={labelClass}>
                Mode
              </label>
              <select
                id="mode"
                className={fieldClass}
                value={mode}
                onChange={(event) => setMode(event.target.value as QrMode)}
              >
                <option value="auto">Auto segment selection</option>
                <option value="numeric">Numeric segment</option>
                <option value="alphanumeric">Alphanumeric segment</option>
                <option value="byte">Byte segment (UTF-8)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ecl" className={labelClass}>
                Error correction
              </label>
              <select
                id="ecl"
                className={fieldClass}
                value={ecl}
                onChange={(event) => setEcl(event.target.value as QrEcc)}
              >
                <option value="LOW">LOW (7%)</option>
                <option value="MEDIUM">MEDIUM (15%)</option>
                <option value="QUARTILE">QUARTILE (25%)</option>
                <option value="HIGH">HIGH (30%)</option>
              </select>
            </div>

            <div>
              <label htmlFor="mask" className={labelClass}>
                Mask
              </label>
              <select
                id="mask"
                className={fieldClass}
                value={String(mask)}
                onChange={(event) => {
                  const value = event.target.value;
                  setMask(value === 'auto' ? 'auto' : (Number(value) as QrMask));
                }}
              >
                <option value="auto">Auto</option>
                {Array.from({ length: 8 }, (_, idx) => (
                  <option key={idx} value={idx}>
                    {idx}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="min-version" className={labelClass}>
                Min version
              </label>
              <input
                id="min-version"
                className={fieldClass}
                type="number"
                min={1}
                max={40}
                value={minVersion}
                onChange={(event) => setMinVersion(Number(event.target.value) || 1)}
              />
            </div>

            <div>
              <label htmlFor="max-version" className={labelClass}>
                Max version
              </label>
              <input
                id="max-version"
                className={fieldClass}
                type="number"
                min={1}
                max={40}
                value={maxVersion}
                onChange={(event) => setMaxVersion(Number(event.target.value) || 40)}
              />
            </div>

            <div className="flex flex-col justify-end">
              <label htmlFor="boost-ecl" className={labelClass}>
                Boost ECL when possible
              </label>
              <input
                id="boost-ecl"
                className="mt-1 h-4 w-4 accent-[#8f7b55]"
                type="checkbox"
                checked={boostEcl}
                onChange={(event) => setBoostEcl(event.target.checked)}
              />
            </div>
          </div>
        </section>

        <section className={`${panelClass} grid content-start gap-4`}>
          {result.error ? (
            <div className="rounded-[10px] border border-[#d27f7f] bg-[#fff3f3] p-3.5 text-[#8a2a2a]">
              {result.error}
            </div>
          ) : (
            <>
              <QrPreview svg={result.data!.svg} />
              <div className="flex justify-center">
                <button
                  type="button"
                  className="cursor-pointer rounded-[9px] border border-[#8f7b55] bg-[linear-gradient(180deg,#f7efdb_0%,#ecdcb8_100%)] px-4 py-2.5 font-semibold text-[#2b2518] transition hover:bg-[linear-gradient(180deg,#f9f3e4_0%,#f1e3c4_100%)] active:translate-y-px"
                  onClick={handleSavePng}
                >
                  Save QR as PNG
                </button>
              </div>
              <div className="grid gap-1.5 text-[0.94rem] text-[#332d22]">
                <span>Requested mode: {result.data!.metadata.requestedMode}</span>
                <span>Used mode: {result.data!.metadata.usedMode}</span>
                <span>Requested ECL: {result.data!.metadata.requestedEcl}</span>
                <span>Actual ECL: {result.data!.metadata.actualEcl}</span>
                <span>Version: {result.data!.metadata.version}</span>
                <span>
                  Size: {result.data!.metadata.size}x{result.data!.metadata.size}
                </span>
                <span>Mask: {result.data!.metadata.mask}</span>
                <span>Segments: {result.data!.metadata.segmentCount}</span>
                <span>Dark modules: {result.data!.metadata.darkModules}</span>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
