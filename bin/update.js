#!/usr/bin/env node

/* eslint-disable no-console */

import updater from '../dist/updater.cjs'

console.log('Requesting tld data...')

updater.run(() => console.log('Update complete.'))
