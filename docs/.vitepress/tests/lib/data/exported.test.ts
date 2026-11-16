import { describe, expect, it } from 'vitest'

import * as exported from '../../../lib/data/exported.ts'

const STORED = {
  stored: {
    headers    : { Black: 'B', Date: '1981', Event: 'E', Round: '1', White: 'W' },
    moves      : ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
    placements : ['p1', 'p2', 'p3']
  }
}

describe('rowsOf', () => {
  it('cuts each inner field to its first items or tags beside the count of the rest', () => {
    expect(exported.rowsOf('stored', STORED).map(({ lines }) => lines.map(({ text }) => text))).toEqual([
      ['"stored": {'],
      ['"headers": {', '"Black": "B",', '"Date": "1981",', '"Event": "E",', '… 2 more', '},'],
      ['"moves": ["e4", "e5", "Nf3", "Nc6", … 2 more],'],
      ['"placements": ["p1", … 2 more]'],
      ['}']
    ])
  })

  it('sets each row but the closing one beside the meaning of the field it writes', () => {
    const rows = exported.rowsOf('span', { span: { length: 3, offset: 0, start: 1 } })
    expect(rows.map(({ note }) => note?.meaning === undefined)).toEqual([false, false, false, false, true])
  })

  it('writes a number field on one row', () => {
    expect(exported.rowsOf('ties', { ties: 2 }).map(({ lines }) => lines)).toEqual([
      [{ depth: 0, text: '"ties": 2' }]
    ])
  })
})
