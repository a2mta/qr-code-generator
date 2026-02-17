import { qrcodegen } from '../libs/qrCodeGenerator';

const SVG_BORDER = 2;

export type QrMode = 'auto' | 'numeric' | 'alphanumeric' | 'byte';
export type QrEcc = 'LOW' | 'MEDIUM' | 'QUARTILE' | 'HIGH';
export type QrMask = 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type QrModeUsed = 'none' | 'numeric' | 'alphanumeric' | 'byte' | 'mixed';

export type GenerateQrOptions = {
  text: string;
  mode: QrMode;
  ecl: QrEcc;
  minVersion: number;
  maxVersion: number;
  mask: QrMask;
  boostEcl: boolean;
};

export type GenerateQrResult = {
  svg: string;
  metadata: {
    requestedMode: QrMode;
    usedMode: QrModeUsed;
    requestedEcl: QrEcc;
    actualEcl: QrEcc;
    version: number;
    size: number;
    mask: number;
    segmentCount: number;
    darkModules: number;
  };
};

const ECL_MAP: Record<QrEcc, typeof qrcodegen.QrCode.Ecc.LOW> = {
  LOW: qrcodegen.QrCode.Ecc.LOW,
  MEDIUM: qrcodegen.QrCode.Ecc.MEDIUM,
  QUARTILE: qrcodegen.QrCode.Ecc.QUARTILE,
  HIGH: qrcodegen.QrCode.Ecc.HIGH,
};

const ECL_BY_ORDINAL: Record<number, QrEcc> = {
  0: 'LOW',
  1: 'MEDIUM',
  2: 'QUARTILE',
  3: 'HIGH',
};

const MODE_BY_BITS: Record<number, QrModeUsed> = {
  0x1: 'numeric',
  0x2: 'alphanumeric',
  0x4: 'byte',
};

function clampVersion(value: number): number {
  return Math.min(40, Math.max(1, Math.trunc(value) || 1));
}

function buildSegments(text: string, mode: QrMode): Array<qrcodegen.QrSegment> {
  if (mode === 'auto') {
    return qrcodegen.QrSegment.makeSegments(text);
  }

  if (mode === 'numeric') {
    return [qrcodegen.QrSegment.makeNumeric(text)];
  }

  if (mode === 'alphanumeric') {
    return [qrcodegen.QrSegment.makeAlphanumeric(text)];
  }

  return [qrcodegen.QrSegment.makeBytes(Array.from(new TextEncoder().encode(text)))];
}

function detectUsedMode(segments: Array<qrcodegen.QrSegment>): QrModeUsed {
  if (segments.length === 0) {
    return 'none';
  }

  const used = new Set<QrModeUsed>();
  for (const segment of segments) {
    const mode = MODE_BY_BITS[segment.mode.modeBits] ?? 'mixed';
    used.add(mode);
  }

  if (used.size === 1) {
    const [single] = Array.from(used);
    return single;
  }

  return 'mixed';
}

function countDarkModules(qr: qrcodegen.QrCode): number {
  let dark = 0;
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) {
        dark += 1;
      }
    }
  }
  return dark;
}

function toSvg(qr: qrcodegen.QrCode): string {
  const viewBox = qr.size + SVG_BORDER * 2;
  let path = '';

  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) {
        path += `M${x + SVG_BORDER},${y + SVG_BORDER}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path.trim()}" fill="#000"/></svg>`;
}

export function getInputCapabilities(text: string): {
  isNumeric: boolean;
  isAlphanumeric: boolean;
} {
  return {
    isNumeric: qrcodegen.QrSegment.isNumeric(text),
    isAlphanumeric: qrcodegen.QrSegment.isAlphanumeric(text),
  };
}

export function generateQrCode(options: GenerateQrOptions): GenerateQrResult {
  const minVersion = clampVersion(options.minVersion);
  const maxVersion = clampVersion(options.maxVersion);

  if (minVersion > maxVersion) {
    throw new RangeError('Minimum version cannot be greater than maximum version');
  }

  const segments = buildSegments(options.text, options.mode);
  const qr = qrcodegen.QrCode.encodeSegments(
    segments,
    ECL_MAP[options.ecl],
    minVersion,
    maxVersion,
    options.mask === 'auto' ? -1 : options.mask,
    options.boostEcl,
  );

  return {
    svg: toSvg(qr),
    metadata: {
      requestedMode: options.mode,
      usedMode: detectUsedMode(segments),
      requestedEcl: options.ecl,
      actualEcl: ECL_BY_ORDINAL[qr.errorCorrectionLevel.ordinal],
      version: qr.version,
      size: qr.size,
      mask: qr.mask,
      segmentCount: segments.length,
      darkModules: countDarkModules(qr),
    },
  };
}
