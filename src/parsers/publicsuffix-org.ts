import punycode from 'punycode/'
import SuffixTrie from '../suffix-trie'

/**
 * Filters a commented or empty line
 *
 * @param {string} row
 * @return {string|null}
 */
function keepOnlyRules(row: string) {
  const trimmed = row.trim()
  if (trimmed.length === 0 || trimmed.indexOf('//') === 0)
    return null

  // TODO - Ignore leading or trailing dot

  return trimmed
}

/**
 * Returns a rule based on string analysis
 *
 * @param {string} row
 * @return {object} a public suffix rule
 */
function domainBuilder(row: string) {
  const rule: { exception: boolean, source?: string, parts?: string[] } = {
    exception: false,
    source: undefined,
    parts: undefined,
  }

  // Only read line up to the first white-space
  const spaceIndex = row.indexOf(' ')
  if (spaceIndex !== -1)
    row = row.substr(0, spaceIndex)

  row = punycode.toASCII(row)

  // Keep track of initial rule
  rule.source = row

  // Exception
  if (row[0] === '!') {
    row = row.substr(1)
    rule.exception = true
  }

  rule.parts = row.split('.').reverse()

  return rule
}

/**
 * Parse a one-domain-per-line file
 *
 * @param body {String}
 * @return {Array}
 */
export default {
  parse(body) {
    return new SuffixTrie((`${body}`)
      .split('\n')
      .map(keepOnlyRules)
      .filter((r) => { return r !== null })
      .map(domainBuilder))
  },
}
