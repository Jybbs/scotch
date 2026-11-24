import { describe, expect, it } from 'vitest'

import * as commands from '../../../../docs/.vitepress/lib/data/commands.ts'

const GAMES    = 'index/games.parquet'
const MANIFEST = 'downloads/manifest.json'

describe('commands', () => {
  it('reads every command the help lists and every file of the layout, split at its folder', () => {
    expect(commands.COMMANDS.map(({ name }) => name)).toEqual([
      'cite source', 'fetch games', 'index games', 'match game', 'match games', 'show game', 'show position',
      'show store'
    ])
    expect(commands.FILES.map(({ name }) => name)).toEqual([
      'pgnmentor.com/', 'manifest.json', 'games.parquet', 'left.parquet', 'positions.bin', 'manifest.json'
    ])
    expect(commands.FOLDERS).toEqual(['downloads/', 'index/'])
    expect(commands.filesOf('index/').map(({ path }) => path)).toEqual([
      'index/games.parquet', 'index/left.parquet', 'index/positions.bin', 'index/manifest.json'
    ])
    expect(commands.commandsOf('show')).toHaveLength(3)
  })

  it.each([
    { command: 'fetch games', file: 'downloads/manifest.json', kind: 'writes' },
    { command: 'index games', file: 'downloads/manifest.json', kind: 'reads' },
    { command: 'show store', file: 'index/positions.bin', kind: 'reads' },
    { command: 'cite source', file: 'index/positions.bin', kind: undefined }
  ])('reads that $command $kind $file', ({ command, file, kind }) => {
    expect(commands.edgeOf(command, file)).toBe(kind)
  })
})

describe('reaches', () => {
  it.each([
    { aim: null, command: 'fetch games', file: null, reached: false },
    { aim: { square: [1, 1] as const }, command: 'fetch games', file: MANIFEST, reached: true },
    { aim: { square: [1, 1] as const }, command: 'index games', file: null, reached: false },
    { aim: { command: 'fetch games' }, command: 'fetch games', file: null, reached: true },
    { aim: { command: 'fetch games' }, command: 'fetch games', file: GAMES, reached: false },
    { aim: { command: 'fetch games' }, command: null, file: MANIFEST, reached: true },
    { aim: { command: 'fetch games' }, command: null, file: null, reached: false },
    { aim: { file: GAMES }, command: null, file: GAMES, reached: true },
    { aim: { file: GAMES }, command: 'match game', file: GAMES, reached: true },
    { aim: { file: GAMES }, command: 'match game', file: null, reached: true },
    { aim: { file: GAMES }, command: 'fetch games', file: null, reached: false },
    { aim: { file: GAMES }, command: null, file: null, reached: false }
  ])('reads whether $aim reaches $command and $file', ({ aim, command, file, reached }) => {
    expect(commands.reaches(aim, command, file)).toBe(reached)
  })
})

describe('readingsOf', () => {
  it.each([
    {
      aim      : null,
      readings : [['Commands', '8'], ['Writes', '6'], ['Reads', '27'], ['Touches', '6 of 6', 'files']],
      tab      : 'all'
    },
    {
      aim      : null,
      readings : [
        ['Command', 'fetch games'], ['Writes', '2'], ['Reads', '0'], ['Touches', '2 of 6', 'files']
      ],
      tab      : 'fetch'
    },
    {
      aim      : { command: 'cite source' },
      readings : [
        ['Command', 'cite source'], ['Writes', '0'], ['Reads', '0'], ['Touches', '0 of 6', 'files']
      ],
      tab      : 'all'
    },
    {
      aim      : { file: 'index/games.parquet' },
      readings : [
        ['File', 'games.parquet'], ['Written by', 'index games'], ['Read by', '5', 'commands'],
        ['Folder', '459.9 MB']
      ],
      tab      : 'all'
    },
    {
      aim      : { square: [0, 0] as const },
      readings : [
        ['Command', 'cite source'], ['File', 'pgnmentor.com/'], ['Does', 'Neither'], ['Folder', '1.1 GB']
      ],
      tab      : 'all'
    }
  ] as const)('reads the readings aimed at $aim on the $tab tab', ({ aim, readings, tab }) => {
    expect(commands.readingsOf(aim, tab)).toEqual(readings)
  })
})
