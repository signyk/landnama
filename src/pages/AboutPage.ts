export const AboutPage = {
    render(_params: Record<string, string>): HTMLElement {
        const el = document.createElement("div");
        el.innerHTML = `
      <nav class="navbar">
        <span class="nav-brand"><a href="/dashboard">Landnáma</a></span>
      </nav>
      <div class="page-content">
        <h1>Um Landnámu</h1>
        <div class="about-text">
          <p>
            Landnáma notar lista yfir lönd og svæði frá
            <a href="https://travelerscenturyclub.org/countries-and-territories/" target="_blank" rel="noopener">Travelers' Century Club</a>
            (TCC). TCC eru alþjóðleg félagasamtök fólks sem hefur heimsótt að minnsta kosti 100 lönd eða svæði.
          </p>
          <p>
            Listinn inniheldur ${new Intl.NumberFormat("is").format(330)} lönd og svæði — mun fleiri en hefðbundnir listar yfir þjóðríki,
            þar sem margar eyjar eða önnur sérstök landsvæði eru talin sér.
            Til dæmis eru Alaska og Bandaríkin (meginland) talin sem tvö aðskild svæði,
            og hvert ríki Sameinuðu arabísku furstadæmanna er talið fyrir sig.
          </p>
          <p>
            Nánari upplýsingar um listann og skilyrði TCC má finna á
            <a href="https://travelerscenturyclub.org" target="_blank" rel="noopener">travelerscenturyclub.org</a>.
          </p>
        </div>
      </div>
    `;
        return el;
    },
};
