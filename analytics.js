/* GA4 + Microsoft Clarity + 브라우저별 옵트아웃
   ─────────────────────────────────────────────────────────────────────────
   ?noga=1 로 한 번 방문하면 이 브라우저에서는 둘 다 로드되지 않는다(localStorage 유지, IP 바뀌어도 지속).
   ?noga=0 으로 해제. 옵트아웃 상태에선 window.gtag가 정의되지 않으므로 이벤트 호출은 전부 무시된다.
   localhost, file://, 사설 IP 대역은 항상 제외.
   홈은 해시 라우팅이라 자동 page_view를 끄고 route()에서 직접 보낸다(window.__GA_MANUAL__ = true).

   2026.08 수정 (GA, Clarity 30일치 점검 결과 반영)
   1) page_location 정규화: /portfolio/ 와 /portfolio/index.html 이 따로 집계돼
      조회수 41 대 17, 체류 6초 대 31초로 쪼개져 둘 다 틀린 값이 나오고 있었다.
   2) 사설 IP 대역 차단: 192.168.x 에서 잡힌 본인 트래픽 제외. 표본이 30일 37세션이라
      본인 방문 몇 개가 수치를 크게 흔든다.
   3) 스크롤 깊이 이벤트 추가: Clarity는 90%를 아는데 GA에는 이 데이터가 없었다.
      홈은 페이지 요소가 각자 스크롤 컨테이너라 캡처 단계에서 함께 잡는다.
      세로로 스크롤할 수 없는 화면은 집계하지 않는다(depthOf 주석 참고).
   4) case_open 에 from 파라미터 추가: 카드, Work 목록, 메뉴, 하단 Next 띠를 구분.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  document.documentElement.classList.add('js');

  var GA_ID = 'G-E6V7FC0PJP';
  var CLARITY_ID = 'xi1lbv7a6n';

  /* ── 수집 제외 판정 ── */
  var host = location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return;
  if (host === '[::1]' || /\.local$/i.test(host)) return;
  /* 사설 IP: 10.x, 192.168.x, 172.16~31.x */
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return;

  try {
    var p = new URLSearchParams(location.search).get('noga');
    if (p === '1') localStorage.setItem('ga_optout', '1');
    else if (p === '0') localStorage.removeItem('ga_optout');
    if (localStorage.getItem('ga_optout') === '1') return;
  } catch (e) {}

  /* ── page_location 정규화 ──
     index.html 을 떼서 홈 주소 하나로 합친다. 쿼리는 UTM 이 붙어 있으므로 남긴다.
     해시는 GA4가 경로로 치지 않으므로 뺀다(홈은 route()가 경로형 주소를 따로 지어 보낸다). */
  function normLoc() {
    return location.origin
         + location.pathname.replace(/\/index\.html$/, '/')
         + location.search;
  }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, {
    send_page_view: !window.__GA_MANUAL__,
    page_location: normLoc()
  });

  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", CLARITY_ID);

  /* ── 클릭: 바깥으로 나가는 링크와 케이스 진입 ── */
  /* 어느 자리에서 눌렀는지 나눈다. 메뉴는 모든 페이지에 떠 있어서
     '카드가 아니면 카드' 식으로 묶으면 메뉴 클릭이 카드 클릭으로 섞여 들어간다. */
  function originOf(a){
    if (a.closest('.next')) return 'next_nav';         /* 케이스 하단 다음 케이스 띠 */
    if (a.closest('.menu-overlay')) return 'menu';     /* 전체 메뉴 */
    if (a.closest('.card')) return 'card';             /* 홈 히어로 카드 캐러셀 */
    if (a.closest('.windex')) return 'work_list';      /* 홈 Work 목록 */
    return 'inline';                                   /* 본문 안의 링크 */
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if (!a || !a.href || !window.gtag) return;
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim().slice(0, 60);
    var from = originOf(a);

    if (/^https?:/.test(href) && a.hostname !== location.hostname) {
      gtag('event', 'outbound_click', { link_url: href, link_text: text });
    } else if (/^case-/.test(href)) {
      gtag('event', 'case_open', {
        case_slug: href.replace(/^case-|\.html$/g, ''),
        link_text: text,
        from: from
      });
    } else if (/deliverables\.html/.test(href)) {
      gtag('event', 'deliverables_click', { link_text: text, from: from });
    } else if (/design-system\.html/.test(href)) {
      gtag('event', 'design_system_click', { link_text: text, from: from });
    }
  }, true);

  /* ── 스크롤 깊이 ──
     케이스 페이지는 문서가 스크롤하고, 홈은 .page 요소가 각자 스크롤 컨테이너다.
     scroll 은 버블링하지 않으므로 캡처 단계에서 document 에 걸어 둘 다 받는다.
     같은 화면에서 같은 구간을 두 번 보내지 않도록 화면 키마다 기록을 따로 둔다. */
  var STEPS = [25, 50, 75, 100];
  var fired = {};
  var ticking = false;

  function screenKey(){
    return location.pathname.replace(/\/index\.html$/, '/') + (location.hash || '');
  }

  /* 세로로 스크롤할 수 없는 요소는 깊이를 잴 수 없다. -1로 돌려서 아예 집계하지 않는다.
     100으로 치면 두 군데가 거짓으로 잡힌다.
     하나는 홈 히어로(#page-home, 100dvh 고정 overflow:hidden)라 진입만 해도 25/50/75/100 네 개가 한꺼번에 나가고,
     또 하나는 가로 필름스트립(.shots, overflow-x:auto)이라 옆으로 밀기만 해도 그 화면이 끝까지 읽힌 것으로 잡힌다.
     스크롤이 없는 화면은 이벤트가 없는 것 자체가 '스크롤할 게 없었다'는 신호다. */
  function depthOf(el){
    var h = el.scrollHeight;
    var view = el.clientHeight;
    if (!h || h <= view + 4) return -1;
    return ((el.scrollTop + view) / h) * 100;
  }

  function report(el){
    if (!window.gtag) return;
    var d = depthOf(el);
    if (d < 0) return;
    var key = screenKey();
    var seen = fired[key] || (fired[key] = {});
    for (var i = 0; i < STEPS.length; i++) {
      var step = STEPS[i];
      if (d >= step && !seen[step]) {
        seen[step] = true;
        gtag('event', 'scroll_depth', { percent_scrolled: step, screen: key });
      }
    }
  }

  function onScroll(e){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      try {
        var t = e.target;
        var el = (!t || t === document || t === window)
               ? (document.scrollingElement || document.documentElement)
               : t;
        if (el && typeof el.scrollTop === 'number') report(el);
      } catch (err) {}
    });
  }

  /* nav.js의 스크롤 진행바와 같은 방식으로 건다(nav.js:65, 116) */
  document.addEventListener('scroll', onScroll, {passive:true, capture:true});
  window.addEventListener('hashchange', function(){
    /* 화면이 바뀌면 새 화면 기준으로 다시 센다. route()가 .page.visible을 바꾼 뒤에 재야 한다 */
    setTimeout(function(){
      try {
        var vis = document.querySelector('.page.visible');
        report(vis || document.scrollingElement || document.documentElement);
      } catch (err) {}
    }, 300);
  });

  /* 첫 화면은 스크롤을 한 번도 안 해도 보이는 만큼은 집계한다(스크롤이 없는 화면은 report가 걸러낸다) */
  window.addEventListener('load', function(){
    setTimeout(function(){
      try {
        var vis = document.querySelector('.page.visible');
        report(vis || document.scrollingElement || document.documentElement);
      } catch (err) {}
    }, 800);
  });
})();
