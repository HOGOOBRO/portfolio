/* 공통 내비게이션 동작: 메뉴 열고 닫기 + 현재 위치 표시.
   홈은 해시 라우팅(#/work 등)이라 hashchange에도 현재 위치를 다시 잡는다. */
(function(){
  var menu = document.getElementById('menu');
  var btn  = document.getElementById('menuBtn');
  if(!menu || !btn) return;

  function setMenu(open){
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  }
  window.__setMenu = setMenu;                 /* 홈 라우터가 페이지 전환 때 닫는다 */

  btn.addEventListener('click', function(){
    setMenu(!menu.classList.contains('open'));
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') setMenu(false);
  });
  if(location.search.indexOf('menu') >= 0) setMenu(true);   /* 캡처·디버그용 */

  /* 현재 위치 표시. 케이스는 상위인 Work를 현재로 본다(케이스는 Work의 하위). */
  function markCurrent(){
    var file = location.pathname.split('/').pop() || 'index.html';
    var key;
    if(/^case-/.test(file))            key = 'work';
    else if(file === 'deliverables.html')  key = 'deliverables';
    else if(file === 'design-system.html') key = 'design-system';
    else key = (location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'index';

    menu.querySelectorAll('.menu-list a').forEach(function(a){
      if(a.dataset.nav === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  markCurrent();
  window.addEventListener('hashchange', markCurrent);
})();

/* 스크롤 진행: 문서 스크롤(케이스·산출물·디자인시스템)과 홈의 페이지별 스크롤 영역을 모두 다룬다 */
(function(){
  var bar = document.querySelector('.scroll-progress i');
  if(!bar) return;
  function pct(el){
    var max = (el.scrollHeight - el.clientHeight);
    return max > 0 ? Math.min(1, el.scrollTop / max) : 0;
  }
  function update(){
    var scroller = document.querySelector('.page.visible.scrolly') || document.scrollingElement;
    bar.style.width = (pct(scroller) * 100).toFixed(2) + '%';
  }
  window.addEventListener('scroll', update, {passive:true});
  document.addEventListener('scroll', update, {passive:true, capture:true});
  window.addEventListener('resize', update);
  window.addEventListener('hashchange', function(){ setTimeout(update, 60); });
  update();
})();

/* 한/영 전환: 선택은 브라우저에 저장되고 모든 페이지에서 유지된다 */
(function(){
  var ko = document.getElementById('ko-btn'), en = document.getElementById('en-btn');
  if(!ko || !en) return;
  /* 영문이 아직 다 채워지지 않은 페이지에서는 토글을 감춘다.
     한 페이지 안에서 한글과 영문이 섞여 보이는 것보다 한국어만 보이는 편이 낫다. */
  if(!document.body.classList.contains('i18n-ready')){
    var box = ko.parentElement; if(box) box.style.display='none';
    document.body.classList.add('lang-ko'); return;
  }
  function setLang(l){
    var isEn = (l === 'en');
    document.body.classList.toggle('lang-en', isEn);
    document.body.classList.toggle('lang-ko', !isEn);
    document.documentElement.lang = isEn ? 'en' : 'ko';
    ko.classList.toggle('on', !isEn);
    en.classList.toggle('on', isEn);
    try{ localStorage.setItem('lang', l); }catch(e){}
  }
  var saved = 'ko';
  try{ saved = localStorage.getItem('lang') || 'ko'; }catch(e){}
  setLang(saved);
  ko.onclick = function(){ setLang('ko'); };
  en.onclick = function(){ setLang('en'); };
})();

/* 스크롤 방향에 따라 크롬 감추기/보이기.
   rAF는 보이지 않는 프레임에서 지연될 수 있어 쓰지 않는다. */
(function(){
  var chrome = document.querySelector('.chrome');
  var menu = document.getElementById('menu');
  if(!chrome) return;
  var last = 0;
  function scroller(){
    return document.querySelector('.page.visible.scrolly') || document.scrollingElement;
  }
  function onScroll(){
    if(menu && menu.classList.contains('open')){ chrome.classList.remove('hide'); return; }
    var y = scroller().scrollTop;
    chrome.classList.toggle('solid', y > 24);   /* 배경 바: 겹침 방지 */
    if(y > last + 4 && y > 90) chrome.classList.add('hide');
    else if(y < last - 4 || y <= 90) chrome.classList.remove('hide');
    last = y;
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  document.addEventListener('scroll', onScroll, {passive:true, capture:true});
  window.addEventListener('hashchange', function(){ chrome.classList.remove('hide'); last = 0; });
  document.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('#menuBtn')) chrome.classList.remove('hide');
  });
})();

/* 문서 간 이동에 홈과 같은 셔터 전환을 준다.
   @view-transition은 브라우저 지원과 조건을 타서, 직접 그려 어디서나 같게 만든다. */
(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var sh = document.createElement('div');
  sh.className = 'shutter';           /* 나갈 때만 쓴다. 들어올 때는 .page-in(CSS)이 담당 */
  document.body.appendChild(sh);

  function isHome(href){
    return href === '#/' || href === 'index.html' || /index\.html#\/?$/.test(href) || href === './' || href === '/';
  }
  var closedAt = 0;
  function close_then(fn, center){
    closedAt = Date.now();
    sh.className = (center ? 'shutter center' : 'shutter') + ' closing';
    setTimeout(fn, 280);
  }
  /* 이벤트(pageshow·pagehide)는 브라우저·상황에 따라 안 오는 경우가 있다.
     닫힌 셔터가 일정 시간 이상 남아 있으면 스스로 풀리게 해 검은 화면이 남지 않도록 한다.
     bfcache에서 복원되면 이 검사가 곧바로 통과해 즉시 열린다. */
  setInterval(function(){
    if(/closing/.test(sh.className) && Date.now() - closedAt > 1500) resetShutter();
  }, 300);
  function open_now(center){
    var b = center ? 'shutter center' : 'shutter';
    sh.className = b + ' opening';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ sh.className = b + ' done'; });
    });
    setTimeout(function(){ sh.className = 'shutter'; }, 380);
  }
  /* 뒤로가기로 돌아온 페이지가 bfcache에서 복원되면 셔터가 닫힌 채로 남아 검은 화면이 된다.
     복원·표시 시점마다 셔터를 반드시 열어둔다. */
  function resetShutter(){ sh.className = 'shutter'; }
  function resetIfStuck(){ if(/closing/.test(sh.className)) resetShutter(); }
  /* bfcache에서 복원된 경우에만 초기화한다(최초 로드에서 초기화하면 진입 애니메이션이 지워진다) */
  window.addEventListener('pageshow', function(e){ if(e.persisted) resetShutter(); });
  /* 페이지가 얼려지기 직전에 셔터를 비운다. 닫힌 채로 bfcache에 들어가면 뒤로가기 때 검은 화면이 남는다 */
  window.addEventListener('pagehide', resetShutter);
  window.addEventListener('popstate', resetIfStuck);
  window.addEventListener('hashchange', function(){ setTimeout(resetIfStuck, 560); });
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) resetIfStuck();
  });

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if(!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if(a.hostname && a.hostname !== location.hostname) return;

    var menuOpen = menu && menu.classList.contains('open');

    /* 같은 문서 안의 해시 이동(홈의 Index·Work·About·Contact) */
    if(/^#/.test(href)){
      if(href === location.hash || (href === '#/' && !location.hash)) return;
      e.preventDefault();
      var c = isHome(href);
      if(menuOpen){
        /* 메뉴가 이미 화면을 덮고 있다. 그 뒤에서 페이지를 바꾸고 메뉴만 걷어낸다(모션 하나) */
        location.hash = href.slice(1);
        setTimeout(function(){ if(window.__setMenu) window.__setMenu(false); }, 80);
        return;
      }
      /* 나갈 때는 항상 같은 방향으로 닫는다. 가운데 분할은 들어올 때만 쓴다.
         둘 다 가운데면 모였다 갈라지는 대칭이 되어 두 박자로 읽힌다. */
      close_then(function(){
        location.hash = href.slice(1);
        setTimeout(function(){ open_now(c); }, 60);
      });
      return;
    }
    if(!/\.html($|[#?])/.test(href) && !/^\/?$/.test(href)) return;   /* 같은 사이트 문서만 */
    e.preventDefault();
    var toHome = isHome(href);
    if(toHome){ try{ sessionStorage.setItem('shutter_center','1'); }catch(e){} }
    if(menuOpen){ location.href = a.href; return; }   /* 메뉴가 이미 검은 화면이므로 바로 이동 */
    close_then(function(){ location.href = a.href; });
  });
})();
