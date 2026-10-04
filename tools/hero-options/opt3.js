/* Option 3: the plant draws itself as an elevation, then fills with glass, light and steel. */
(function () {
  var svg = document.getElementById('plantSvg');
  svg.querySelectorAll('.lines path, .lines g path').forEach(function (p, i) { p.style.setProperty('--i', i); });
  function play() { svg.classList.remove('play'); void svg.getBoundingClientRect(); svg.classList.add('play'); }
  play();
  document.getElementById('replay').addEventListener('click', play);
})();
