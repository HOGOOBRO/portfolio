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
