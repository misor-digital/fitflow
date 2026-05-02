/**
 * Speedy Label Printing
 *
 * Generates PDF shipping labels via the Speedy Print endpoint.
 * Handles batching for large numbers of parcels.
 */

import 'server-only';

import { printLabels as speedyPrintLabels } from './client';

export type LabelFormat = 'A4' | 'A6' | 'A4_4xA6';

const BATCH_SIZE = 10;

/**
 * Generate PDF label(s) for one or more parcels.
 * Returns raw PDF binary (ArrayBuffer).
 */
export async function generateLabels(
  parcelIds: string[],
  format: LabelFormat = 'A6',
): Promise<ArrayBuffer> {
  if (parcelIds.length === 0) {
    throw new Error('No parcel IDs provided for label generation');
  }

  return speedyPrintLabels({
    paperSize: format,
    parcels: parcelIds.map((id) => ({ parcel: { id } })),
  });
}

/**
 * Generate labels for a batch of parcels, splitting into chunks if needed.
 * Returns an array of PDF buffers (one per batch).
 */
export async function generateLabelsInBatches(
  parcelIds: string[],
  format: LabelFormat = 'A6',
): Promise<ArrayBuffer[]> {
  if (parcelIds.length === 0) {
    throw new Error('No parcel IDs provided for label generation');
  }

  if (parcelIds.length <= BATCH_SIZE) {
    return [await generateLabels(parcelIds, format)];
  }

  const batches: string[][] = [];
  for (let i = 0; i < parcelIds.length; i += BATCH_SIZE) {
    batches.push(parcelIds.slice(i, i + BATCH_SIZE));
  }

  return Promise.all(batches.map((batch) => generateLabels(batch, format)));
}

/**
 * Merge multiple PDF buffers into a single PDF using pdf-lib.
 * Only call this if batching produced multiple buffers.
 */
export async function mergePdfBuffers(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  if (buffers.length === 1) {
    return new Uint8Array(buffers[0]);
  }

  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();

  for (const buffer of buffers) {
    const pdf = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return merged.save();
}
