/*
 * @adonisjs/presets
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { mkdir } from 'node:fs/promises'
import { joinToURL } from '@poppinss/utils'
import type Configure from '@adonisjs/core/commands/configure'

/**
 * Collection of dialects that can be configured
 */
export const DIALECTS: {
  [K in 'sqlite' | 'mysql' | 'postgres' | 'mssql']: {
    envVars?: Record<string, number | string>
    envValidations?: Record<string, string>
    name: string
    pkg: string
  }
} = {
  sqlite: {
    name: 'SQLite',
    pkg: 'better-sqlite3',
  },
  mysql: {
    name: 'MySQL',
    pkg: 'mysql2',
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
  },
  postgres: {
    name: 'PostgreSQL',
    pkg: 'pg',
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 5432,
      DB_USER: 'postgres',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
  },
  mssql: {
    name: 'MS SQL',
    pkg: 'tedious',
    envVars: {
      DB_HOST: '127.0.0.1',
      DB_PORT: 1433,
      DB_USER: 'sa',
      DB_PASSWORD: '',
      DB_DATABASE: '',
    },
    envValidations: {
      DB_HOST: `Env.schema.string({ format: 'host' })`,
      DB_PORT: `Env.schema.number()`,
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string.optional()',
      DB_DATABASE: 'Env.schema.string()',
    },
  },
}

/**
 * Configures @adonisjs/lucid package by performing following
 * steps.
 *
 * - Creates config/database.ts file.
 * - Registers lucid commands and provider.
 * - Define env variables and their validations (if any)
 * - Creates tmp directory to store sqlite database file
 * - Installs required packages if(options.installPackages === true)
 */
export async function presetLucid(
  command: Configure,
  options: {
    dialect: keyof typeof DIALECTS
    installPackages: boolean
  }
) {
  command.stubsRoot = joinToURL(import.meta.url, 'stubs')

  const codemods = await command.createCodemods()
  const { pkg, envVars, envValidations } = DIALECTS[options.dialect]
  const packagesToInstall = [
    { name: pkg, isDevDependency: false },
    { name: 'luxon', isDevDependency: false },
    { name: '@types/luxon', isDevDependency: true },
  ]

  /**
   * Publish config file
   */
  await command.publishStub('config.stub', { dialect: options.dialect })

  /**
   * Create the "tmp" directory when using sqlite
   */
  if (options.dialect === 'sqlite') {
    try {
      await mkdir(command.app.tmpPath(), { recursive: true })
    } catch {}
  }

  /**
   * Register commands and provider to the rcfile
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('@adonisjs/lucid/commands')
    rcFile.addProvider('@adonisjs/lucid/database_provider')
  })

  /**
   * Define env variables when selected dialect config
   * needs them
   */
  if (envVars) {
    codemods.defineEnvVariables(envVars)
  }

  /**
   * Define env variables validations when selected
   * dialect config needs them
   */
  if (envValidations) {
    codemods.defineEnvValidations({
      variables: envValidations,
      leadingComment: 'Variables for configuring database connection',
    })
  }

  /**
   * Install packages or share instructions to install them
   */
  if (options.installPackages) {
    await command.installPackages(packagesToInstall)
  } else {
    command.listPackagesToInstall(packagesToInstall)
  }
}
