import { navbar, initNavHamburger } from '../components/nav'
import { authStore } from '../auth/authStore'

export const PrivacyPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement('div')
        el.innerHTML = `
      ${navbar(null, authStore.user?.id)}
      <div class="page-content">
        <h1>Persónuverndarstefna</h1>
        <div class="about-text">
          <p>Síðast uppfært: mars 2026</p>
          <h2>Hvaða gögn við geymum</h2>
          <p>
            Við geymum netfangið þitt (notað til að auðkenna þig) og þær ferðaupplýsingar sem þú skráir — þ.e. hvaða lönd og svæði þú hefur merkt sem heimsótt.
            Við geymum einnig birtingarnafn ef þú velur að setja það.
          </p>
          <h2>Hvernig við notum gögnin</h2>
          <p>
            Gögnin eru eingöngu notuð til að birta ferðalista þinn og stigatöflur sem þú tekur þátt í.
            Við seljum ekki gögn og notum þau ekki í auglýsingaskyni.
          </p>
          <h2>Gagnageymsla</h2>
          <p>
            Gögn eru geymd hjá <a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a>, sem er gagnaveita þessarar síðu.
            Supabase starfar í samræmi við GDPR.
          </p>
          <h2>Eyðing gagna</h2>
          <p>
            Þú getur eytt aðgangi þínum og öllum tengdum gögnum á <a href="/profile/${authStore.user?.id ?? ''}">prófílsíðu þinni</a> (undir „Eyða aðgangi").
          </p>
        </div>
      </div>
    `
        initNavHamburger(el)
        return el
    },
}
