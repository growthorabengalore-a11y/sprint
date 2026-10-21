import { toPng } from 'html-to-image';
/** Renders a dedicated report node to a real PNG file download (2x+ pixel ratio). */
export async function downloadPng(node: HTMLElement, filename: string) {
  if ((document as any).fonts?.ready) await (document as any).fonts.ready;
  await new Promise((r) => setTimeout(r, 400)); // let charts/layout settle
  const ratio = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
  const url = await toPng(node, { pixelRatio: ratio, cacheBust: true, backgroundColor: '#ffffff', width: node.scrollWidth, height: node.scrollHeight });
  const a = document.createElement('a');
  a.href = url; a.download = filename.replace(/[^\w.-]+/g, '_'); document.body.appendChild(a); a.click(); a.remove();
}
