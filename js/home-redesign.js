/* Home page visual refresh — scoped to #vHome only.
 * Keeps scan/list/business logic untouched.
 */
(function () {
  const css = `
  #vHome{position:relative;isolation:isolate;padding-top:4px;padding-bottom:28px}
  #vHome::before,#vHome::after{content:"";position:absolute;z-index:-1;border-radius:50%;pointer-events:none}
  #vHome::before{width:360px;height:360px;right:-230px;top:70px;background:rgba(170,238,220,.18)}
  #vHome::after{width:270px;height:270px;left:-175px;top:260px;background:rgba(120,232,196,.13)}

  header.app{padding-top:calc(18px + env(safe-area-inset-top));padding-bottom:14px;background:rgba(243,250,252,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  .app-mark{width:52px;height:52px;border-radius:16px;box-shadow:0 8px 22px rgba(8,116,63,.16)}
  header.app h1{font-size:22px;line-height:1.15;font-weight:800;letter-spacing:-.02em}
  .lp-head-copy{min-width:0;flex:1}
  .lp-head-copy h1{margin:0}
  .lp-head-sub{margin-top:3px;color:var(--sec);font-size:13px;font-weight:600}
  .badge{padding:7px 13px;font-size:12.5px}

  .home-welcome{margin:18px 0 20px}
  .home-welcome-title{margin:0;font-size:32px;line-height:1.1;font-weight:850;letter-spacing:-.035em;color:#073B2D}
  .home-welcome-name{margin:7px 0 0;font-size:23px;line-height:1.2;font-weight:800;color:#667B8A}
  .home-heading{margin:12px 0 18px;font-size:16px;line-height:1.45;font-weight:650;letter-spacing:0;color:var(--sec)}

  .mode-grid{gap:12px}
  button.mode-tile{padding:0 0 14px;border-radius:24px;border:1px solid rgba(194,220,226,.95);box-shadow:0 12px 28px rgba(20,40,58,.07);background:rgba(255,255,255,.97)}
  button.mode-tile:active{transform:scale(.98)}
  .mode-art{aspect-ratio:1/1;border-bottom:1px solid rgba(228,238,241,.9)}
  .mode-copy{padding:18px 10px 0;min-height:190px}
  .mode-code{margin:0 0 10px;font-size:34px;font-weight:900;color:#082F27}
  .mode-title{font-size:16px;font-weight:800;color:#102B2A}
  .mode-sub{font-size:13px;color:#718697}
  .mode-cap{display:none!important}
  .mode-open{margin-top:auto;width:88%;min-width:0;height:46px;border-radius:999px;background:linear-gradient(180deg,#12B77E,#079763);font-size:15px;font-weight:800;box-shadow:0 8px 18px rgba(7,151,99,.18)}
  .mode-open::after{content:"›";font-size:25px;line-height:1;margin-left:10px;margin-top:-2px}
  .home-meta{display:none!important}

  @media(max-width:390px){
    #vHome{padding-left:16px;padding-right:16px}
    .app-mark{width:48px;height:48px}
    header.app h1{font-size:20px}
    .lp-head-sub{font-size:12px}
    .home-welcome-title{font-size:29px}
    .home-welcome-name{font-size:21px}
    .mode-grid{gap:10px}
    .mode-copy{min-height:178px;padding-left:7px;padding-right:7px}
    .mode-code{font-size:31px}
    .mode-title{font-size:14px}
    .mode-sub{font-size:12px}
    .mode-open{width:90%;height:44px;font-size:14px}
  }
  `;

  function applyHomeRefresh(){
    if (document.getElementById('lp-home-refresh-style')) return;

    const style=document.createElement('style');
    style.id='lp-home-refresh-style';
    style.textContent=css;
    document.head.appendChild(style);

    const header=document.querySelector('header.app');
    const title=document.getElementById('appTitle');
    if(header && title && !header.querySelector('.lp-head-copy')){
      const wrap=document.createElement('div');
      wrap.className='lp-head-copy';
      title.parentNode.insertBefore(wrap,title);
      wrap.appendChild(title);
      const sub=document.createElement('div');
      sub.className='lp-head-sub';
      sub.textContent='สแกนง่าย จัดการได้ไว';
      wrap.appendChild(sub);
    }

    const home=document.getElementById('vHome');
    const heading=document.getElementById('homeHeading');
    if(home && heading && !home.querySelector('.home-welcome')){
      const welcome=document.createElement('div');
      welcome.className='home-welcome';
      welcome.innerHTML='<h2 class="home-welcome-title">สวัสดีครับ</h2><p class="home-welcome-name" id="homeEmployeeName">พนักงาน</p>';
      home.insertBefore(welcome,heading);
      heading.textContent='เลือกแบบฟอร์ม เพื่อเริ่มใช้งาน';
    }

    const empInfo=document.getElementById('empInfo');
    const homeName=document.getElementById('homeEmployeeName');
    const syncName=()=>{
      if(!empInfo||!homeName) return;
      const raw=(empInfo.textContent||'').trim();
      if(!raw || raw==='—') return;
      const m=raw.match(/^พนักงาน:\s*(.*?)\s*\([^)]*\)$/);
      homeName.textContent=(m&&m[1])?m[1]:raw.replace(/^พนักงาน:\s*/, '');
    };
    syncName();
    if(empInfo){ new MutationObserver(syncName).observe(empInfo,{childList:true,subtree:true,characterData:true}); }

    const updateHeaderSub=()=>{
      const sub=document.querySelector('.lp-head-sub');
      if(!sub||!title) return;
      sub.style.display=title.textContent==='LP Scan Form'?'block':'none';
    };
    updateHeaderSub();
    if(title){ new MutationObserver(updateHeaderSub).observe(title,{childList:true,subtree:true,characterData:true}); }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyHomeRefresh,{once:true});
  else applyHomeRefresh();
})();
