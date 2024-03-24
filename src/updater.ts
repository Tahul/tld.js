import { join } from 'node:path'
import http from 'node:https'
import fs from 'node:fs'
import pkg from '../package.json'
import parser from './parsers/publicsuffix-org.js'

const providerUrl = pkg.tldjs.providers['publicsuffix-org']

export default {
  providerUrl,
  run: function runUpdater(done) {
    done = typeof done === 'function' ? done : function () {}

    const req = http.request(providerUrl, (res) => {
      let body = ''

      if (res.statusCode !== 200) {
        res.destroy()
        return done(new Error(`tldjs: remote server responded with HTTP status ${res.statusCode}`))
      }

      res.setEncoding('utf8')

      res.on('data', (d) => {
        body += d
      })

      res.on('end', () => {
        const tlds = parser.parse(body)
        const filename = 'rules.json'
        const data = JSON.stringify(tlds)

        fs.writeFile(join(__dirname, '..', filename), data, 'utf-8', done)
      })
    })

    req.setTimeout(5000)
    req.on('error', done)
    req.end()
  },
}
