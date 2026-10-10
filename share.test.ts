import { describe, expect, it } from 'vitest'
import { reportIdFromHash, reportLink, whatsappLink } from './share.ts'

const ID = '3b241101-e2bb-4255-8caf-4136c566a962'

describe('report links', () => {
  it('reads a report id from the hash and ignores anything else', () => {
    expect(reportIdFromHash(`#r=${ID}`)).toBe(ID)
    expect(reportIdFromHash('')).toBeNull()
    expect(reportIdFromHash('#map')).toBeNull()
    expect(reportIdFromHash('#r=not-a-uuid')).toBeNull()
    expect(reportIdFromHash(`#r=${ID}&x=<script>`)).toBeNull()
  })

  it('builds a link back to the report on this site', () => {
    expect(reportLink(ID, { origin: 'https://main.example.amplifyapp.com', pathname: '/' })).toBe(
      `https://main.example.amplifyapp.com/#r=${ID}`,
    )
  })

  it('encodes Hindi text and the link for WhatsApp', () => {
    const url = `https://x.example/#r=${ID}`
    const link = whatsappLink('क्या आपने भी देखा?', url)
    expect(link.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(link.slice('https://wa.me/?text='.length))).toBe(`क्या आपने भी देखा? ${url}`)
    expect(link).not.toContain('#')
  })
})
