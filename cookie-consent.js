// Banner informativo sui cookie/localStorage tecnici di Monkey.
// Indipendente dal runtime "dc" (che è un file generato e non va modificato):
// puro JS/DOM, sicuro da caricare su qualsiasi pagina del sito.
// Il sito usa solo localStorage strettamente necessario al funzionamento
// (sessione, lingua, carrello: vedi Cookie.html) — non richiede consenso
// preventivo, ma un avviso informativo è comunque buona prassi.
(function () {
  var STORAGE_KEY = 'monkey_cookie_notice_ack_v1';

  function alreadyAcknowledged() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return true; // localStorage non disponibile: non mostrare il banner.
    }
  }

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    var el = document.getElementById('monkey-cookie-banner');
    if (el) el.remove();
  }

  function showBanner() {
    var isEN = (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('en') === 0;
    var text = isEN
      ? 'We use only technical/functional local storage needed to run the site (session, language, cart). No tracking or profiling. See our '
      : 'Usiamo solo dati tecnici salvati localmente, necessari al funzionamento del sito (sessione, lingua, carrello). Nessun tracciamento. Consulta la nostra ';
    var linkLabel = isEN ? 'Cookie Policy' : 'Cookie Policy';
    var btnLabel = isEN ? 'Got it' : 'Ho capito';

    var wrap = document.createElement('div');
    wrap.id = 'monkey-cookie-banner';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', isEN ? 'Cookie notice' : 'Avviso cookie');
    wrap.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#3D2A1B;color:#FFFCF7;padding:14px 20px;display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;font:400 13.5px/1.5 \'Nunito\',system-ui,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,0.15);';

    var msg = document.createElement('span');
    msg.style.cssText = 'max-width:640px;';
    msg.textContent = text;
    var link = document.createElement('a');
    link.href = 'Cookie.html';
    link.textContent = linkLabel;
    link.style.cssText = 'color:#FFC247;font-weight:700;text-decoration:underline;';
    msg.appendChild(link);
    msg.appendChild(document.createTextNode('.'));

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = btnLabel;
    btn.style.cssText = 'padding:9px 20px;border-radius:999px;border:none;background:#FFC247;color:#3D2A1B;font:700 13px \'Baloo 2\',\'Nunito\',sans-serif;cursor:pointer;flex:none;';
    btn.addEventListener('click', acknowledge);

    wrap.appendChild(msg);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function init() {
    if (alreadyAcknowledged()) return;
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner);
  }

  init();
})();
