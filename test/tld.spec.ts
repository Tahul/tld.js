import { beforeAll, describe, expect, it } from 'vitest'
import tld from '../src/index'
import isIp from '../src/is-ip'
import parser from '../src/parsers/publicsuffix-org'

function repeat(str, n) {
  let res = ''
  for (let i = 0; i < n; i += 1)
    res += str

  return res
}

describe('tld.js', () => {
  describe('constructor', () => {
    it('should be a pure object', () => {
      expect(tld.constructor.name).toEqual('Object')
    })

    it('should have .rules map', () => {
      expect((tld as any).rules).toEqual(undefined)
    })

    it('should not have any .validHosts property', () => {
      expect((tld as any).validHosts).toEqual(undefined)
    })

    it('should export bound methods', () => {
      const getDomain = tld.getDomain
      const domain = 'fr.google.com'

      expect(tld.getDomain(domain)).to.equal(getDomain(domain))
    })
  })

  describe('isValid method', () => {
    // That's a 255 characters long hostname
    let maxSizeHostname = 'a'
    for (let i = 0; i < 127; i += 1)
      maxSizeHostname += '.a'

    it('should detect valid hostname', () => {
      expect(tld.isValid('')).toEqual(false)
      expect(tld.isValid('-google.com')).toEqual(false)
      expect(tld.isValid('google-.com')).toEqual(false)
      expect(tld.isValid('google.com-')).toEqual(false)
      expect(tld.isValid('.google.com')).toEqual(false)
      expect(tld.isValid('google..com')).toEqual(false)
      expect(tld.isValid('google.com..')).toEqual(false)
      expect(tld.isValid(`example.${repeat('a', 64)}.`)).toEqual(false)
      expect(tld.isValid(`example.${repeat('a', 64)}`)).toEqual(false)
      expect(tld.isValid('googl@.com..')).toEqual(false)

      // Length of 256 (too long)
      expect(tld.isValid(`${maxSizeHostname}a`)).toEqual(false)

      expect(tld.isValid('google.com')).toEqual(true)
      expect(tld.isValid('miam.google.com')).toEqual(true)
      expect(tld.isValid('miam.miam.google.com')).toEqual(true)
      expect(tld.isValid(`example.${repeat('a', 63)}.`)).toEqual(true)
      expect(tld.isValid(`example.${repeat('a', 63)}`)).toEqual(true)

      // @see https://github.com/oncletom/tld.js/issues/95
      expect(tld.isValid('miam.miam.google.com.')).toEqual(true)

      // Length of 255 (maximum allowed)
      expect(tld.isValid(maxSizeHostname)).toEqual(true)
    })

    it('should detect invalid hostname', () => {
      expect(tld.isValid(null)).toEqual(false)
      expect(tld.isValid(undefined)).toEqual(false)
      expect(tld.isValid(0)).toEqual(false)
      expect(tld.isValid([])).toEqual(false)
      expect(tld.isValid({})).toEqual(false)
      expect(tld.isValid(() => {
      })).toEqual(false)
    })

    it('should be falsy on invalid domain syntax', () => {
      expect(tld.isValid('.localhost')).toEqual(false)
      expect(tld.isValid('.google.com')).toEqual(false)
      expect(tld.isValid('.com')).toEqual(false)
    })
  })

  describe('isIp method', () => {
    it('should return false on incorrect inputs', () => {
      expect(isIp('')).toEqual(false)
      expect(isIp(null)).toEqual(false)
      expect(isIp(undefined)).toEqual(false)
      expect(isIp({})).toEqual(false)
    })

    it('should return true on valid ip addresses', () => {
      expect(isIp('::1')).toEqual(true)
      expect(isIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toEqual(true)
      expect(isIp('192.168.0.1')).toEqual(true)
    })

    it('should return false on invalid ip addresses', () => {
      expect(isIp('::1-')).toEqual(false)
      expect(isIp('[::1]')).toEqual(false)
      expect(isIp('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]')).toEqual(false)
      expect(isIp('192.168.0.1.')).toEqual(false)
      expect(isIp('192.168.0')).toEqual(false)
      expect(isIp('192.168.0.')).toEqual(false)
      expect(isIp('192.16-8.0.1')).toEqual(false)
    })
  })

  describe('getDomain method', () => {
    it('should return the expected domain from a simple string', () => {
      expect(tld.getDomain('google.com')).to.equal('google.com')
      expect(tld.getDomain('t.co')).to.equal('t.co')
      expect(tld.getDomain('  GOOGLE.COM   ')).to.equal('google.com')
      expect(tld.getDomain('    t.CO    ')).to.equal('t.co')
    })

    it('should return the relevant domain of a two levels domain', () => {
      expect(tld.getDomain('google.co.uk')).to.equal('google.co.uk')
    })

    it('should return the relevant domain from a subdomain string', () => {
      expect(tld.getDomain('fr.google.com')).to.equal('google.com')
      expect(tld.getDomain('foo.google.co.uk')).to.equal('google.co.uk')
      expect(tld.getDomain('fr.t.co')).to.equal('t.co')
    })

    it('should not break on specific RegExp characters', () => {
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/33
        tld.getDomain('www.weir)domain.com')
      }).not.throw()
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/53
        tld.getDomain('http://(\'4drsteve.com\', [], [\'54.213.246.177\'])/xmlrpc.php')
      }).not.throw()
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/53
        tld.getDomain('(\'4drsteve.com\', [], [\'54.213.246.177\'])')
      }).not.throw()
    })

    // @see https://github.com/oncletom/tld.js/issues/53
    it('should correctly extract domain from paths including "@" in the path', () => {
      const domain = tld.getDomain('http://cdn.jsdelivr.net/g/jquery@1.8.2,jquery.waypoints@2.0.2,qtip2@2.2.1,typeahead.js@0.9.3,sisyphus@0.1,jquery.slick@1.3.15,fastclick@1.0.3')
      expect(domain).to.equal('jsdelivr.net')
    })

    it('should provide consistent results', () => {
      expect(tld.getDomain('www.bl.uk')).to.equal('bl.uk')
      expect(tld.getDomain('www.majestic12.co.uk')).to.equal('majestic12.co.uk')
    })

    // @see https://github.com/oncletom/tld.js/issues/25
    // @see https://github.com/oncletom/tld.js/issues/30
    it('existing rule constraint', () => {
      expect(tld.getDomain('s3.amazonaws.com')).toEqual(null)
      expect(tld.getDomain('blogspot.co.uk')).toEqual(null)
    })

    it('should return nytimes.com even in a whole valid', () => {
      expect(tld.getDomain('http://www.nytimes.com/')).toEqual('nytimes.com')
    })

    // @see https://github.com/oncletom/tld.js/issues/95
    it('should ignore the trailing dot in a domain', () => {
      expect(tld.getDomain('https://www.google.co.uk./maps')).to.equal('google.co.uk')
    })
  })

  describe('tldExists method', () => {
    it('should be truthy on existing TLD', () => {
      expect(tld.tldExists('com')).toEqual(true)
      expect(tld.tldExists('example.com')).toEqual(true)
      expect(tld.tldExists('co.uk')).toEqual(true)
      expect(tld.tldExists('amazon.co.uk')).toEqual(true)
      expect(tld.tldExists('台灣')).toEqual(true)
      expect(tld.tldExists('台灣.台灣')).toEqual(true)
    })

    it('should be falsy on unexisting TLD', () => {
      expect(tld.tldExists('con')).toEqual(false)
      expect(tld.tldExists('example.con')).toEqual(false)
      expect(tld.tldExists('go')).toEqual(false)
      expect(tld.tldExists('チーズ')).toEqual(false)
    })

    it('should be truthy on complex TLD which cannot be verified as long as the gTLD exists', () => {
      expect(tld.tldExists('uk.com')).toEqual(true)
    })

    // @see https://github.com/oncletom/tld.js/issues/95
    it('should ignore the trailing dot in a domain', () => {
      expect(tld.tldExists('https://www.google.co.uk./maps')).toEqual(true)
    })
  })

  describe('#getPublicSuffix', () => {
    it('should return co.uk if google.co.uk', () => {
      expect(tld.getPublicSuffix('google.co.uk')).toEqual('co.uk')
    })

    // @see https://github.com/oncletom/tld.js/pull/97
    it('should return www.ck if www.www.ck', () => {
      expect(tld.getPublicSuffix('www.www.ck')).toEqual('ck')
    })

    // @see https://github.com/oncletom/tld.js/issues/30
    it('should return s3.amazonaws.com if s3.amazonaws.com', () => {
      expect(tld.getPublicSuffix('s3.amazonaws.com')).toEqual('s3.amazonaws.com')
    })

    it('should return s3.amazonaws.com if www.s3.amazonaws.com', () => {
      expect(tld.getPublicSuffix('s3.amazonaws.com')).toEqual('s3.amazonaws.com')
    })

    it('should directly return the suffix if it matches a rule key', () => {
      expect(tld.getPublicSuffix('youtube')).toEqual('youtube')
    })

    it('should return the suffix if a rule exists that has no exceptions', () => {
      expect(tld.getPublicSuffix('microsoft.eu')).toEqual('eu')
    })

    // @see https://github.com/oncletom/tld.js/pull/97
    it('should return the string TLD if the publicsuffix does not exist', () => {
      expect(tld.getPublicSuffix('www.freedom.nsa')).toEqual('nsa')
    })

    // @see https://github.com/oncletom/tld.js/issues/95
    it('should ignore the trailing dot in a domain', () => {
      expect(tld.getPublicSuffix('https://www.google.co.uk./maps')).to.equal('co.uk')
    })
  })

  describe('extractHostname', () => {
    it('should return a valid hostname as is', () => {
      expect(tld.extractHostname(' example.CO.uk ')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less URL', () => {
      expect(tld.extractHostname('example.co.uk/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less + port URL', () => {
      expect(tld.extractHostname('example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less + authentication URL', () => {
      expect(tld.extractHostname('user:password@example.co.uk/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less + passwordless URL', () => {
      expect(tld.extractHostname('user@example.co.uk/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less + authentication + port URL', () => {
      expect(tld.extractHostname('user:password@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a scheme-less + passwordless + port URL', () => {
      expect(tld.extractHostname('user@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a user-password same-scheme URL', () => {
      expect(tld.extractHostname('//user:password@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a passwordless same-scheme URL', () => {
      expect(tld.extractHostname('//user@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a complex user-password scheme URL', () => {
      expect(tld.extractHostname('git+ssh://user:password@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the hostname of a complex passwordless scheme URL', () => {
      expect(tld.extractHostname('git+ssh://user@example.co.uk:8080/some/path?and&query#hash')).to.equal('example.co.uk')
    })

    it('should return the initial value if it is not a valid hostname', () => {
      expect(tld.extractHostname(42)).to.equal('42')
    })

    it('should return www.nytimes.com even with an URL as a parameter', () => {
      expect(tld.extractHostname('http://www.nytimes.com/glogin?URI=http://www.notnytimes.com/2010/03/26/us/politics/26court.html&OQ=_rQ3D1Q26&OP=45263736Q2FKgi!KQ7Dr!K@@@Ko!fQ24KJg(Q3FQ5Cgg!Q60KQ60W.WKWQ22KQ60IKyQ3FKigQ24Q26!Q26(Q3FKQ60I(gyQ5C!Q2Ao!fQ24')).to.equal('www.nytimes.com')
    })

    it('should return punycode for international hostnames', () => {
      expect(tld.extractHostname('台灣')).to.equal('xn--kpry57d')
    })

    // @see https://github.com/oncletom/tld.js/issues/95
    it('should ignore the trailing dot in a domain', () => {
      expect(tld.extractHostname('http://example.co.uk./some/path?and&query#hash')).to.equal('example.co.uk')
    })
  })

  describe('getSubdomain method', () => {
    it('should return null if the domain cannot be found', () => {
      expect(tld.getSubdomain('not-a-validHost')).to.equal(null)
    })

    it('should return the relevant subdomain of a hostname', () => {
      expect(tld.getSubdomain('localhost')).to.equal(null)
      expect(tld.getSubdomain('google.com')).to.equal('')
      expect(tld.getSubdomain('fr.google.com')).to.equal('fr')
      expect(tld.getSubdomain('random.fr.google.com')).to.equal('random.fr')
      expect(tld.getSubdomain('my.custom.domain')).to.equal('my')
    })

    it('should return the relevant subdomain of a badly trimmed string', () => {
      expect(tld.getSubdomain(' google.COM')).to.equal('')
      expect(tld.getSubdomain('   fr.GOOGLE.COM ')).to.equal('fr')
      expect(tld.getSubdomain(' random.FR.google.com')).to.equal('random.fr')
    })

    it('should return the subdomain of a TLD + SLD hostname', () => {
      expect(tld.getSubdomain('love.fukushima.jp')).to.equal('')
      expect(tld.getSubdomain('i.love.fukushima.jp')).to.equal('i')
      expect(tld.getSubdomain('random.nuclear.strike.co.jp')).to.equal('random.nuclear')
    })

    it('should return the subdomain of a wildcard hostname', () => {
      expect(tld.getSubdomain('google.co.uk')).to.equal('')
      expect(tld.getSubdomain('fr.google.co.uk')).to.equal('fr')
      expect(tld.getSubdomain('random.fr.google.co.uk')).to.equal('random.fr')
    })

    // @see https://github.com/oncletom/tld.js/issues/25
    it.skip('should return the subdomain of reserved subdomains', () => {
      expect(tld.getSubdomain('blogspot.co.uk')).to.equal('')
      expect(tld.getSubdomain('emergency.blogspot.co.uk')).to.equal('emergency')
    })

    it('should not break on specific RegExp characters', () => {
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/33
        tld.getSubdomain('www.weir)domain.com')
      }).not.throw()
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/53
        tld.getSubdomain('http://(\'4drsteve.com\', [], [\'54.213.246.177\'])/xmlrpc.php')
      }).not.throw()
      expect(() => {
        // @see https://github.com/oncletom/tld.js/issues/53
        tld.getSubdomain('(\'4drsteve.com\', [], [\'54.213.246.177\'])')
      }).not.throw()
    })

    // @see https://github.com/oncletom/tld.js/issues/53
    it('should correctly extract domain from paths including "@" in the path', () => {
      const domain = tld.getSubdomain('http://cdn.jsdelivr.net/g/jquery@1.8.2,jquery.waypoints@2.0.2,qtip2@2.2.1,typeahead.js@0.9.3,sisyphus@0.1,jquery.slick@1.3.15,fastclick@1.0.3')
      expect(domain).to.equal('cdn')
    })

    // @see https://github.com/oncletom/tld.js/issues/35
    it('should provide consistent results', () => {
      expect(tld.getSubdomain('www.bl.uk')).to.equal('www')
      expect(tld.getSubdomain('www.majestic12.co.uk')).to.equal('www')
    })

    // @see https://github.com/oncletom/tld.js/issues/95
    it('should ignore the trailing dot in a domain', () => {
      expect(tld.getSubdomain('random.fr.google.co.uk.')).to.equal('random.fr')
    })
  })

  describe('#parse', () => {
    it('should handle ipv6 addresses properly', () => {
      expect(tld.parse('http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]')).to.eql({
        hostname: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        isValid: true,
        isIp: true,
        tldExists: false,
        publicSuffix: null,
        domain: null,
        subdomain: null,
      })
      expect(tld.parse('http://user:pass@[::1]/segment/index.html?query#frag')).to.eql({
        hostname: '::1',
        isValid: true,
        isIp: true,
        tldExists: false,
        publicSuffix: null,
        domain: null,
        subdomain: null,
      })
      expect(tld.parse('https://[::1]')).to.eql({
        hostname: '::1',
        isValid: true,
        isIp: true,
        tldExists: false,
        publicSuffix: null,
        domain: null,
        subdomain: null,
      })
      expect(tld.parse('http://[1080::8:800:200C:417A]/foo')).to.eql({
        hostname: '1080::8:800:200c:417a',
        isValid: true,
        isIp: true,
        tldExists: false,
        publicSuffix: null,
        domain: null,
        subdomain: null,
      })
    })

    it('should handle ipv4 addresses properly', () => {
      expect(tld.parse('http://192.168.0.1/')).to.eql({
        hostname: '192.168.0.1',
        isValid: true,
        isIp: true,
        tldExists: false,
        publicSuffix: null,
        domain: null,
        subdomain: null,
      })

      // `url.parse` currently does not support decoding urls (whatwg-url does)
      // expect(tld.parse('http://%30%78%63%30%2e%30%32%35%30.01%2e')).to.eql({
      //   hostname: '192.168.0.1',
      //   isValid: true,
      //   isIp: true,
      //   tldExists: false,
      //   publicSuffix: null,
      //   domain: null,
      //   subdomain: null,
      // });
    })
  })

  describe('validHosts', () => {
    let customTld

    describe('non-empty array', () => {
      beforeAll(() => {
        customTld = tld.fromUserSettings({
          validHosts: ['localhost'],
        })
      })

      it('should now be a valid host', () => {
        expect(customTld.isValid('localhost')).toEqual(true)
      })

      it('should return the known valid host', () => {
        expect(customTld.getDomain('localhost')).to.equal('localhost')
        expect(customTld.getDomain('subdomain.localhost')).to.equal('localhost')
        expect(customTld.getDomain('subdomain.notlocalhost')).to.equal('subdomain.notlocalhost')
        expect(customTld.getDomain('subdomain.not-localhost')).to.equal('subdomain.not-localhost')
      })

      // @see https://github.com/oncletom/tld.js/issues/66
      it('should return the subdomain of a validHost', () => {
        expect(customTld.getSubdomain('vhost.localhost')).to.equal('vhost')
      })

      it('should fallback to normal extraction if no match in validHost', () => {
        expect(customTld.getSubdomain('vhost.evil.com')).to.equal('vhost')
      })
    })

    describe('empty value', () => {
      it('falls-back to empty array', () => {
        expect(() => {
          customTld = tld.fromUserSettings({ validHosts: null })
        }).not.throw()
        expect(() => {
          customTld = tld.fromUserSettings({ validHosts: undefined })
        }).not.throw()
        expect(() => {
          customTld = tld.fromUserSettings({ validHosts: [] })
        }).not.throw()
      })
    })
  })

  describe('suffixTrie', () => {
    it('should ignore empty line', () => {
      const tlds = parser.parse('\n')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({})
    })

    it('should ignore comment', () => {
      const tlds = parser.parse('// \n')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({})
    })

    it('should parse up to the first space', () => {
      const tlds = parser.parse('co.uk .evil')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ uk: { co: { $: 0 } } })
    })

    it('should parse normal rule', () => {
      const tlds = parser.parse('co.uk')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ uk: { co: { $: 0 } } })
    })

    it('should parse exception', () => {
      const tlds = parser.parse('!co.uk')
      expect(tlds.exceptions).to.eql({ uk: { co: { $: 0 } } })
      expect(tlds.rules).to.eql({})
    })

    it('should parse wildcard', () => {
      let tlds = parser.parse('*')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ '*': { $: 0 } })
      expect(tlds.suffixLookup('foo')).to.equal('foo')

      tlds = parser.parse('*.uk')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ uk: { '*': { $: 0 } } })
      expect(tlds.suffixLookup('bar.uk')).to.equal('bar.uk')
      expect(tlds.suffixLookup('bar.baz')).to.equal(null)

      tlds = parser.parse('foo.*.baz')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ baz: { '*': { foo: { $: 0 } } } })
      expect(tlds.suffixLookup('foo.bar.baz')).to.equal('foo.bar.baz')
      expect(tlds.suffixLookup('foo.foo.bar')).to.equal(null)
      expect(tlds.suffixLookup('bar.foo.baz')).to.equal(null)
      expect(tlds.suffixLookup('foo.baz')).to.equal(null)
      expect(tlds.suffixLookup('baz')).to.equal(null)

      tlds = parser.parse('foo.bar.*')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ '*': { bar: { foo: { $: 0 } } } })
      expect(tlds.suffixLookup('foo.bar.baz')).to.equal('foo.bar.baz')
      expect(tlds.suffixLookup('foo.foo.bar')).to.equal(null)

      tlds = parser.parse('foo.*.*')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({ '*': { '*': { foo: { $: 0 } } } })
      expect(tlds.suffixLookup('foo.bar.baz')).to.equal('foo.bar.baz')
      expect(tlds.suffixLookup('foo.foo.bar')).to.equal('foo.foo.bar')
      expect(tlds.suffixLookup('baz.foo.bar')).to.equal(null)

      tlds = parser.parse('fo.bar.*\nfoo.bar.baz')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({
        'baz': {
          bar: { foo: { $: 0 } },
        },
        '*': {
          bar: { fo: { $: 0 } },
        },
      })
      expect(tlds.suffixLookup('foo.bar.baz')).to.equal('foo.bar.baz')

      tlds = parser.parse('bar.*\nfoo.bar.baz')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({
        'baz': {
          bar: { foo: { $: 0 } },
        },
        '*': {
          bar: { $: 0 },
        },
      })
      expect(tlds.suffixLookup('foo.bar.baz')).to.equal('foo.bar.baz')
    })

    it('should insert rules with same TLD', () => {
      const tlds = parser.parse('co.uk\nca.uk')
      expect(tlds.exceptions).to.eql({})
      expect(tlds.rules).to.eql({
        uk: {
          ca: { $: 0 },
          co: { $: 0 },
        },
      })
    })
  })
})
