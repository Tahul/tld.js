import extractTldFromHost from './from-host.js'

/**
 * Checks if the TLD exists for a given hostname
 *
 * @api
 * @param {string} rules
 * @param {string} hostname
 * @return {boolean}
 */
export default function tldExists(rules, hostname) {
  // Easy case, it's a TLD
  if (rules.hasTld(hostname))
    return true

  // Popping only the TLD of the hostname
  const hostTld = extractTldFromHost(hostname)
  if (hostTld === null)
    return false

  return rules.hasTld(hostTld)
}
