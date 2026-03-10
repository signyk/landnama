import { navbar, initNavHamburger } from '../components/nav'
import { authStore } from '../auth/authStore'

export const AboutPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.innerHTML = `
      ${navbar('about', authStore.user!.id)}
      <div class="page-content">
        <h1>Um Landnámu</h1>
        <div class="about-text">
          <p>
            Landnáma notar lista yfir lönd og svæði frá
            <a href="https://travelerscenturyclub.org/countries-and-territories/" target="_blank" rel="noopener">Travelers' Century Club</a>
            (TCC). TCC eru alþjóðleg félagasamtök fólks sem hefur heimsótt að minnsta kosti 100 lönd eða svæði.
          </p>
          <p>
            Listinn inniheldur ${new Intl.NumberFormat('is').format(330)} lönd og svæði, mun fleiri en hefðbundnir listar yfir þjóðríki,
            þar sem margar eyjar eða önnur sérstök landsvæði eru talin sér.
            Til dæmis eru Alaska og Bandaríkin (meginland) talin sem tvö aðskild svæði,
            og hvert furstadæmi Sameinuðu arabísku furstadæmanna er talið fyrir sig.
          </p>
          <p>
            Nánari upplýsingar um listann og skilyrði TCC má finna á
            <a href="https://travelerscenturyclub.org" target="_blank" rel="noopener">travelerscenturyclub.org</a>.
          </p>
          <p>
            Auk þess eru ${new Intl.NumberFormat('is').format(54)} <strong>fyrrum svæði</strong> á listanum. Þetta eru svæði sem TCC viðurkenndi áður en þau voru lögð niður,
            sameinuð öðrum svæðum eða þjóðríki varð til. Þau birtast neðst á listanum og teljast ef þú heimsóttir þau á meðan þau voru virk.
            Sjá nánari upplýsingar (og nákvæmar dagsetningar) á
            <a href="https://travelerscenturyclub.org/countries-and-territories/retired-territories/" target="_blank" rel="noopener">síðu TCC um fyrrum svæði</a>.
          </p>
          <hr />
          <p>
            Landnáma skilgreinir ekki hvað telst sem „heimsókn", það er undir hverjum og einum að
            ákvarða það. Sumir telja land heimsótt ef þeir hafa stigið fæti á land,
            aðrir krefjast þess að hafa borðað eitthvað eða drukkið, gist þar í eina nótt, farið í gönguferð eða kynnst menningu
            landsins með einhverjum hætti. Flugsamtengingar og skemmtiferðaskip á höfn teljast hjá
            sumum, hjá öðrum ekki. Það sem skiptir máli er að þú veljir reglu og haldir þig við hana.
          </p>
          <hr />
          <p>
            Höfundur Landnámu (þessarar vefsíðu, ekki elstu heimildar um landnám Íslands) er Signý Kristín. Frumkóðinn er aðgengilegur á
            <a href="https://github.com/signyk/landnama" target="_blank" rel="noopener">GitHub</a>.
          </p>
          <p><a href="/privacy" class="muted" style="font-size:0.8rem">Persónuverndarstefna</a></p>
        </div>
      </div>
    `
        initNavHamburger(el)
        return el
    },
}
