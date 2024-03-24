/**
 * Utility to extract the TLD from a hostname string
 *
 * @param {string} host
 * @return {string}
 */
export default function extractTldFromHost(hostname) {
  const lastDotIndex = hostname.lastIndexOf('.')
  if (lastDotIndex === -1)
    return null

  return hostname.substr(lastDotIndex + 1)
};
