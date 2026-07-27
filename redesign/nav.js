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
    var file = location.pathname.split('/').pop() || 'home.html';
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
  /* 직전 페이지가 'Home으로 간다'고 남겨두면, 열릴 때도 가운데에서 갈라지는 결로 맞춘다 */
  var entryCenter = false;
  try{
    entryCenter = sessionStorage.getItem('shutter_center') === '1';
    sessionStorage.removeItem('shutter_center');
  }catch(e){}
  var base = entryCenter ? 'shutter center' : 'shutter';
  sh.className = base + ' opening';
  document.body.appendChild(sh);
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ sh.className = base + ' done'; });
  });
  setTimeout(function(){ sh.className = 'shutter'; }, 500);

  function isHome(href){
    return href === '#/' || href === 'home.html' || /home\.html#\/?$/.test(href);
  }
  function close_then(fn, center){
    sh.className = (center ? 'shutter center' : 'shutter') + ' closing';
    setTimeout(fn, 380);
  }
  function open_now(center){
    var b = center ? 'shutter center' : 'shutter';
    sh.className = b + ' opening';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ sh.className = b + ' done'; });
    });
    setTimeout(function(){ sh.className = 'shutter'; }, 500);
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if(!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if(a.hostname && a.hostname !== location.hostname) return;

    /* 같은 문서 안의 해시 이동(홈의 Index·Work·About·Contact)도 문서 이동과 같은 셔터로 */
    if(/^#/.test(href)){
      if(href === location.hash || (href === '#/' && !location.hash)) return;
      e.preventDefault();
      if(window.__setMenu) window.__setMenu(false);
      var c = isHome(href);
      close_then(function(){
        location.hash = href.slice(1);
        setTimeout(function(){ open_now(c); }, 60);
      }, c);
      return;
    }
    if(!/\.html($|[#?])/.test(href) && !/^\/?$/.test(href)) return;   /* 같은 사이트 문서만 */
    e.preventDefault();
    var toHome = isHome(href);
    if(toHome){ try{ sessionStorage.setItem('shutter_center','1'); }catch(e){} }
    close_then(function(){ location.href = a.href; }, toHome);
  });
})();
