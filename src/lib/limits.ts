/**
 * The decoded-size ceiling for base64-in-JSON content transfers: 25 MiB,
 * Gmail's attachment maximum and the suite's de facto boundary for bytes that
 * must buffer whole into a JSON string. Drive's blob paths, Gmail's
 * attachment download enforce it via
 * `assertWithinDownloadCap`; Drive's Google-native export paths are exempt,
 * bounded instead by Google's own export cap (about 10 MB).
 */
export const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** The ceiling rendered as prose, one spelling for error and schema text alike. */
export const MIB_LABEL = `${MAX_DOWNLOAD_BYTES / (1024 * 1024)} MiB`;

/**
 * Refuse a transfer over the suite ceiling. One construction site for every
 * cap error, so the prose cannot drift from the constant; the options object
 * keeps a swapped subject/action unrepresentable. `size` may be Google's
 * string-typed metadata size; a non-finite value passes (the caller re-checks
 * the bytes that actually arrive, which contains a malformed size to a wasted
 * transfer, never an oversize output). `deferral` cites a wing's tracking
 * issue where larger transfers are deferred.
 */
export function assertWithinDownloadCap(
  size: number | string | null | undefined,
  options: { subject: string; action: string; deferral?: `https://${string}` },
): void {
  const byteLength = Number(size ?? 0);
  if (Number.isFinite(byteLength) && byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `${options.subject} is ${byteLength} bytes; this server caps ${options.action} at ` +
        `${MAX_DOWNLOAD_BYTES} bytes (${MIB_LABEL}).` +
        (options.deferral ? ` Larger transfers are deferred to ${options.deferral}.` : ''),
    );
  }
}
