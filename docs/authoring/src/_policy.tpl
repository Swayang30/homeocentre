<!--meta @META@-->
<body class="hc">
{{HEADER}}

<main class="hc-main" id="main">
  <div class="hc-container">
    <nav class="hc-crumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><span aria-current="page">@TITLE@</span></li></ol></nav>
    <div class="hc-policy">
      <nav class="hc-toc" aria-label="On this page" data-hc="toc">
        <details class="hc-toc__details" data-hc="respdetails" data-open-min="1024">
          <summary>On this page <svg class="hc-icon hc-icon--sm" aria-hidden="true"><use href="#i-chev-down"/></svg></summary>
          <div class="hc-toc__links">
@TOC@
          </div>
        </details>
      </nav>
      <article class="hc-policy__body">
        <header class="hc-pagehead">
          <h1 class="hc-h1">@TITLE@</h1>
          <p class="hc-policy__meta">Last updated: <span class="hc-confirm">CLIENT TO CONFIRM: date</span></p>
        </header>
        <div class="hc-proto-note" role="note">The live site has no text for this page yet. Highlighted parts need the client&rsquo;s wording before launch. Plain text describes how the store already works.</div>
        <!-- POLICY BODY: replace with the approved text -->
        <div class="hc-prose" data-slot="page.content">
          <p class="hc-lead">@LEAD@</p>
@BODY@
        </div>
      </article>
    </div>
  </div>
</main>

{{FOOTER}}
</body>
</html>
