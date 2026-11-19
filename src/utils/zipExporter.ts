import JSZip from 'jszip';
import { Frame, LayerGroup } from '../types';
import { frameToCanvas } from './pixelMath';

export async function exportPngSequenceZip(
  frames: Frame[],
  width: number,
  height: number,
  scale: number,
  baseFilename: string,
  layerGroups: LayerGroup[] = []
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(baseFilename) || zip;

  frames.forEach((frame, index) => {
    const canvas = frameToCanvas(frame, width, height, scale, true, layerGroups);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const pad = String(index + 1).padStart(3, '0');
    const filename = `${baseFilename}_frame_${pad}.png`;
    folder.file(filename, base64Data, { base64: true });
  });

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
