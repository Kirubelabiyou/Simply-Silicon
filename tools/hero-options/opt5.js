/* Option 5: power, then connectivity, then compute light up in sequence, then keep flowing quietly. */
(function () {
  var svg = document.getElementById('flowSvg'), g = document.getElementById('leds'), NS = 'http://www.w3.org/2000/svg', k = 0;
  [446, 502, 558].forEach(function (x, c) {
    for (var r = 0; r < 9; r++) {
      var slot = document.createElementNS(NS, 'rect'); slot.setAttribute('x', x - 16); slot.setAttribute('y', 314 + r * 11.4); slot.setAttribute('width', 24); slot.setAttribute('height', 5); slot.setAttribute('rx', 1.5); slot.setAttribute('fill', '#2a2f37'); g.appendChild(slot);
      var led = document.createElementNS(NS, 'circle'); led.setAttribute('cx', x + 14); led.setAttribute('cy', 316.5 + r * 11.4); led.setAttribute('r', 2.2); led.setAttribute('class', 'led'); led.style.setProperty('--i', k++); g.appendChild(led);
    }
  });
  function play() { svg.classList.remove('play'); void svg.getBoundingClientRect(); svg.classList.add('play'); }
  function fit() { svg.setAttribute('viewBox', innerWidth < 860 ? '70 200 920 290' : '0 0 1000 560'); }
  fit(); addEventListener('resize', fit);
  play();
  document.getElementById('replay').addEventListener('click', play);
})();
