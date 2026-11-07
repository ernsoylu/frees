import { describe, expect, it } from 'vitest'
import { fullAppUrl, parseEmbed } from './embed'

describe('embed options (I4)', () => {
  it('reads the documented parameters', () => {
    expect(parseEmbed('?embed=1&view=plot&readonly&sliders=R_s,C_s&theme=light&example=lesson-rc-charging')).toEqual({
      embed: true, view: 'plot', readonly: true, sliders: ['R_s', 'C_s'], theme: 'light', example: 'lesson-rc-charging',
    })
    expect(parseEmbed('')).toEqual({ embed: false, view: null, readonly: false, sliders: null, theme: null, example: null })
  })

  it('drops anything outside the whitelist and bounds the slider list', () => {
    const o = parseEmbed('?embed=0&view=editor&theme=neon&example=../x&sliders=a,1b,a,<x>,b,c,d,e,f,g,h,i')
    expect(o.embed).toBe(false)
    expect(o.view).toBeNull()
    expect(o.theme).toBeNull()
    expect(o.example).toBeNull()
    expect(o.sliders).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })

  it('opens the same model in the full application', () => {
    expect(fullAppUrl('https://frees.example/app/?embed=1&view=plot&readonly&sliders=a&theme=light&example=lesson-diode#share=abc'))
      .toBe('https://frees.example/app/?example=lesson-diode#share=abc')
  })
})
