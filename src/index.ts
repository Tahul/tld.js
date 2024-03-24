'use strict'

// Load rules
import rulesJson from '../rules.json'
import Trie from './suffix-trie.js'

// Internals
import extractHostname from './clean-host.js'
import getDomain from './domain.js'
import getPublicSuffix from './public-suffix.js'
import getSubdomain from './subdomain.js'
import isValidHostname from './is-valid.js'
import isIp from './is-ip.js'
import tldExists from './tld-exists.js'

// Flags representing steps in the `parse` function. They are used to implement
// a early stop mechanism (simulating some form of laziness) to avoid doing more
// work than necessary to perform a given action (e.g.: we don't need to extract
// the domain and subdomain if we are only interested in public suffix).
const TLD_EXISTS = 1
const PUBLIC_SUFFIX = 2
const DOMAIN = 3
const SUB_DOMAIN = 4
const ALL = 5
const allRules = Trie.fromJson(rulesJson)

/**
 * Creates a new instance of tldjs
 * @param  {Object.<rules,validHosts>} options [description]
 * @return {tldjs | object}                      [description]
 */
function factory(options) {
  const rules = options.rules || allRules || {}
  const validHosts = options.validHosts || []
  const _extractHostname = options.extractHostname || extractHostname

  /**
   * Process a given url and extract all information. This is a higher level API
   * around private functions of `tld.js`. It allows to remove duplication (only
   * extract hostname from url once for all operations) and implement some early
   * termination mechanism to not pay the price of what we don't need (this
   * simulates laziness at a lower cost).
   *
   * @param {string} url
   * @param {number|undefined} _step - where should we stop processing
   * @return {object}
   */
  function parse(url, _step?: any) {
    const step = _step || ALL
    const result: {
      hostname: string
      isValid: boolean | null
      isIp: boolean | null
      tldExists: boolean | null
      publicSuffix: string | null
      domain: string | null
      subdomain: string | null
    } = {
      hostname: _extractHostname(url),
      isValid: null,
      isIp: null,
      tldExists: false,
      publicSuffix: null,
      domain: null,
      subdomain: null,
    }

    if (result.hostname === null) {
      result.isIp = false
      result.isValid = false
      return result
    }

    // Check if `hostname` is a valid ip address
    result.isIp = isIp(result.hostname)
    if (result.isIp) {
      result.isValid = true
      return result
    }

    // Check if `hostname` is valid
    result.isValid = isValidHostname(result.hostname)
    if (result.isValid === false)
      return result

    // Check if tld exists
    if (step === ALL || step === TLD_EXISTS)
      result.tldExists = tldExists(rules, result.hostname)

    if (step === TLD_EXISTS)
      return result

    // Extract public suffix
    result.publicSuffix = getPublicSuffix(rules, result.hostname)
    if (step === PUBLIC_SUFFIX)
      return result

    // Extract domain
    result.domain = getDomain(validHosts, result.publicSuffix, result.hostname)
    if (step === DOMAIN)
      return result

    // Extract subdomain
    result.subdomain = getSubdomain(result.hostname, result.domain)

    return result
  }

  return {
    extractHostname: _extractHostname,
    isValidHostname,
    isIp,
    isValid(hostname) { return isValidHostname(hostname) },
    parse,
    tldExists(url) {
      return parse(url, TLD_EXISTS).tldExists
    },
    getPublicSuffix(url) {
      return parse(url, PUBLIC_SUFFIX).publicSuffix
    },
    getDomain(url) {
      return parse(url, DOMAIN).domain
    },
    getSubdomain(url) {
      return parse(url, SUB_DOMAIN).subdomain
    },
    fromUserSettings: factory,
  }
}

export default factory({})
