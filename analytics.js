/* GA4 + Microsoft Clarity + 브라우저별 옵트아웃 (현행 사이트와 동일 정책)
   ?noga=1 로 한 번 방문하면 이 브라우저에서는 둘 다 로드되지 않는다(localStorage 유지, IP 바뀌어도 지속).
   ?noga=0 으로 해제. 옵트아웃 상태에선 window.gtag가 정의되지 않으므로 이벤트 호출은 전부 무시된다.
   localhost·file:// 은 항상 제외.
   홈은 해시 라우팅이라 자동 page_view를 끄고 route()에서 직접 보낸다(window.__GA_MANUAL__ = true). */
(function () {
  document.documentElement.classList.add('js');

  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '') return;

  try {
    var p = new URLSearchParams(location.search).get('noga');
    if (p === '1') localStorage.setItem('ga_optout', '1');
    else if (p === '0') localStorage.removeItem('ga_optout');
    if (localStorage.getItem('ga_optout') === '1') return;
  } catch (e) {}

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-E6V7FC0PJP';
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-E6V7FC0PJP', { send_page_view: !window.__GA_MANUAL__ });

  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "xi1lbv7a6n");

  /* 바깥으로 나가는 링크와 케이스 진입을 이벤트로 남긴다 */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if (!a || !a.href || !window.gtag) return;
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim().slice(0, 60);
    if (/^https?:/.test(href) && a.hostname !== location.hostname) {
      gtag('event', 'outbound_click', { link_url: href, link_text: text });
    } else if (/^case-/.test(href)) {
      gtag('event', 'case_open', { case_slug: href.replace(/^case-|\.html$/g, ''), link_text: text });
    } else if (/deliverables\.html/.test(href)) {
      gtag('event', 'deliverables_click', { link_text: text });
    } else if (/design-system\.html/.test(href)) {
      gtag('event', 'design_system_click', { link_text: text });
    }
  }, true);
})();
