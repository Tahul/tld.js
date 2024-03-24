#!/usr/bin/env node

/* eslint-disable no-console */

import process from 'node:process'
import updater from '../dist/updater.cjs'

const SHOULD_UPDATE = process.env.npm_config_tldjs_update_rules === 'true'

if (SHOULD_UPDATE) {
  console.log('tldjs: updating rules from %s.', updater.providerUrl)

  updater.run((err) => {
    if (err) {
      console.error(err.message)
      process.exit(err.code)
    }

    console.log('tldjs: rules list updated.')
    process.exit(0)
  })
}
