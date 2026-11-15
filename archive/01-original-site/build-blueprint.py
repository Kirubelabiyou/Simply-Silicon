"""Build the Blueprint edition of the site into /blueprint.
It reuses the main site's pages, scripts and assets, adds the blueprint.css theme layer,
swaps in the Blueprint hero and shows the live 3D model as a full-width plate on Home.
Run it again after any change to the main pages:  python3 tools/build-blueprint.py"""
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'blueprint'
out.mkdir(exist_ok=True)

HEAD_ADD = '<link rel="stylesheet" href="../assets/css/blueprint.css">\n<script>window.SS_BASE = \'../\';</script>\n'

HERO = '''<!-- 1. Hero (Blueprint): schematic of the product -->
  <section class="bp-hero">
    <div class="wrap wrap--wide">
      <div class="bp-copy hero-copy">
        <span class="bp-kicker">Fig. 01 · Private AI compute</span>
        <h1>Secure, localized compute at scale<span class="stop">.</span></h1>
        <p class="lede">Simply Silicon delivers private, high-performance AI compute inside the city, built for organizations that cannot tolerate latency, outages or exposure to the public network.</p>
        <div class="hero-ctas">
          <button class="btn btn--primary" type="button" data-contact="Request access">Request access</button>
          <a class="btn" href="#how">How it works</a>
        </div>
      </div>
      <figure>
        <svg viewBox="0 0 600 500" role="img" aria-label="Schematic: dedicated server racks joined by private fiber to your building">
          <defs>
            <g id="bpu"><rect x="0" y="0" width="126" height="26" fill="none" stroke="#3b6f92" stroke-width="1"/><line x1="10" y1="13" x2="80" y2="13" stroke="#2d4e66" stroke-width="1"/><circle cx="114" cy="13" r="2.5" fill="#4db2ef"/></g>
            <g id="bpw"><rect x="0" y="0" width="24" height="14" fill="none" stroke="#3b6f92" stroke-width="1"/><rect x="35" y="0" width="24" height="14" fill="none" stroke="#3b6f92" stroke-width="1"/><rect x="70" y="0" width="24" height="14" fill="none" stroke="#3b6f92" stroke-width="1"/></g>
          </defs>
          <line x1="40" y1="34" x2="360" y2="34" stroke="#6b7c8c" stroke-width="1"/>
          <line x1="40" y1="28" x2="40" y2="40" stroke="#6b7c8c" stroke-width="1"/>
          <line x1="360" y1="28" x2="360" y2="40" stroke="#6b7c8c" stroke-width="1"/>
          <text x="200" y="22" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#9aa6b2">BARE METAL · USED BY YOU ALONE</text>
          <rect x="40" y="60" width="150" height="380" fill="none" stroke="#4db2ef" stroke-width="1.25"/>
          <rect x="210" y="60" width="150" height="380" fill="none" stroke="#4db2ef" stroke-width="1.25"/>
          ''' + ''.join(f'<use href="#bpu" x="{x}" y="{76 + i * 36}"/>' for x in (52, 222) for i in range(10)) + '''
          <line x1="360" y1="250" x2="456" y2="250" stroke="#4db2ef" stroke-width="2"/>
          <circle cx="360" cy="250" r="4" fill="#0a0e13" stroke="#4db2ef" stroke-width="1.5"/>
          <circle cx="456" cy="250" r="4" fill="#0a0e13" stroke="#4db2ef" stroke-width="1.5"/>
          <text x="408" y="238" text-anchor="middle" font-size="10" letter-spacing="1.2" fill="#4db2ef">PRIVATE</text>
          <text x="408" y="270" text-anchor="middle" font-size="10" letter-spacing="1.2" fill="#4db2ef">FIBER</text>
          <rect x="456" y="150" width="130" height="290" fill="none" stroke="#9aa6b2" stroke-width="1.25"/>
          ''' + ''.join(f'<use href="#bpw" x="474" y="{170 + i * 30}"/>' for i in range(8)) + '''
          <line x1="10" y1="440" x2="596" y2="440" stroke="#6b7c8c" stroke-width="1"/>
          <text x="521" y="470" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#9aa6b2">YOUR TEAMS</text>
          <text x="200" y="470" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#9aa6b2">YOUR HARDWARE</text>
        </svg>
      </figure>
      <dl class="bp-facts">
        <div><dt>01 Bare metal</dt><dd>Servers only you use</dd></div>
        <div><dt>02 Private fiber</dt><dd>Never the public network</dd></div>
        <div><dt>03 Any model</dt><dd>Whatever you choose to run</dd></div>
        <div><dt>04 Your data</dt><dd>Stays within your organization</dd></div>
      </dl>
    </div>
  </section>

  '''

PLATE = '''<!-- 6. Proof: the live 3D model of our first site -->
  <section class="sec sec--light">
    <div class="wrap">
      <div class="sec-intro">
        <h2 data-rv>Your data stays with you<span class="stop">.</span></h2>
        <p data-rv="2">Your servers run in our secure data centres, on hardware no one else uses. Your data and your models stay within your organization.</p>
      </div>
      <a class="bp-3d" href="foundation.html" data-rv>
        <div class="bp-3d-stage">
          <div class="scene" id="loopScene" aria-hidden="true"></div>
          <span class="bp-tag">Fig. 02 · Foundation, live 3D model</span>
        </div>
        <div class="bp-3d-body">
          <div>
            <span class="status"><i class="dot dot--live"></i>Online</span>
            <h3 style="margin-top:14px">Foundation, our first site<span class="stop">.</span></h3>
            <p>Our first data centre is online. More sites are in development.</p>
            <span class="link">Explore Foundation in 3D <span class="arrow" aria-hidden="true">→</span></span>
          </div>
          <dl class="bp-3d-kv">
            <div><dt>12 MW</dt><dd>n+1 redundant power and cooling</dd></div>
            <div><dt>7 km</dt><dd>Air-gapped fiber</dd></div>
            <div><dt>25+</dt><dd>Connected buildings</dd></div>
            <div><dt>Phase 1</dt><dd>Running now</dd></div>
          </dl>
        </div>
      </a>
    </div>
  </section>

  '''


def rebase(s):
    s = re.sub(r'(["\'(])(?:\./)?assets/', r'\1../assets/', s)
    s = s.replace('<link rel="stylesheet" href="../assets/css/site.css">\n', '<link rel="stylesheet" href="../assets/css/site.css">\n' + HEAD_ADD, 1)
    assert 'blueprint.css' in s
    s = s.replace('https://kirubelabiyou.github.io/Simply-Silicon/"', 'https://kirubelabiyou.github.io/Simply-Silicon/blueprint/"')
    return s


(out / 'careers.html').write_text((root / 'careers.html').read_text())  # a redirect to ./#careers
for name in ['index.html', 'foundation.html', 'workloads.html', 'platform.html']:
    s = (root / name).read_text()
    s = rebase(s)
    if name == 'index.html':
        s, n = re.subn(r'<!-- 1\. Hero.*?(?=<!-- 2\. )', HERO, s, flags=re.S); assert n == 1
        s, n = re.subn(r'<!-- 6\. Proof.*?(?=<!-- 7\. )', PLATE, s, flags=re.S); assert n == 1
    (out / name).write_text(s)
    print('wrote', out / name)
