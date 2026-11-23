import { territories } from '../data/territories'
import { REGION_ORDER } from '../badges'
import { shipSvg, voyage } from './ship'

// A made-up traveller, so the sail on the sign-in pages isn't empty
const SHARE = [0.45, 0.3, 0.85, 0.6, 0.2, 0.15, 0.7, 0.5, 0.25, 0.1, 0.35, 0.05]
const sample = new Set(
    REGION_ORDER.flatMap((region, i) => {
        const inRegion = territories.filter((t) => t.region === region)
        return inRegion.slice(0, Math.ceil(inRegion.length * SHARE[i])).map((t) => t.id)
    }),
)

export const authIntro = (heading: string) => `
  <div class="auth-intro">
    ${shipSvg(voyage(sample))}
    <h1>${heading}</h1>
    <p>Haltu utan um löndin sem þú hefur heimsótt og kepptu við vini þína.</p>
  </div>`
