// 할 일 그림: 아이 얼굴(사진 스티커) + 2D로 그린 몸이 그 일을 하는 모습.
// 그림판 크기 200x230. 얼굴은 위 가운데, 몸은 그 아래.
const SKIN = '#f7d4bb';
const FACE = '<circle cx="100" cy="56" r="44" fill="' + SKIN + '"/>' // 얼굴 사진이 안 뜰 때 대신 보이는 머리
  + '<image href="img/kid-face.png" x="48" y="0" width="104" height="124"/>';
const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${SKIN}"/>`;
const arm = (d, color) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
const body = (shirt, pants = '#4a5bd6') => `
  <rect x="68" y="168" width="28" height="44" rx="12" fill="${pants}"/>
  <rect x="104" y="168" width="28" height="44" rx="12" fill="${pants}"/>
  <ellipse cx="80" cy="214" rx="19" ry="9" fill="#ff6b6b"/><ellipse cx="120" cy="214" rx="19" ry="9" fill="#ff6b6b"/>
  <path d="M60 116 Q100 100 140 116 L148 176 Q100 188 52 176 Z" fill="${shirt}"/>`;
const svg = (inner) => `<svg viewBox="0 0 200 230" aria-hidden="true">${inner}</svg>`;

const ART = {
  // 한 손은 칫솔, 한 손은 컵. 입가에 거품
  brush: () => svg(`${body('#ffb3d1')}
    ${arm('M62 122 Q40 146 48 160', '#ffb3d1')}
    <rect x="30" y="146" width="30" height="34" rx="6" fill="#1fa8f0"/><rect x="30" y="146" width="30" height="8" rx="4" fill="#7fd0ff"/>
    ${hand(46, 158)}
    ${FACE}
    ${arm('M140 124 L176 150 L140 114', '#ffb3d1')}
    <g transform="translate(0 8) rotate(-24 122 98)"><rect x="96" y="92" width="66" height="11" rx="5" fill="#58c322"/>
      <rect x="86" y="86" width="16" height="16" rx="4" fill="#fff" stroke="#9adff5" stroke-width="3"/></g>
    ${hand(138, 114)}
    <circle cx="80" cy="112" r="7" fill="#fff" stroke="#bfe8fb" stroke-width="2"/><circle cx="70" cy="102" r="5" fill="#fff" stroke="#bfe8fb" stroke-width="2"/>
    <circle cx="88" cy="122" r="4" fill="#fff" stroke="#bfe8fb" stroke-width="2"/>`),
  // 티셔츠를 두 손으로 들고 입으려는 모습
  clothes: () => svg(`${body('#e6f4ff')}
    <path d="M66 140 L88 132 Q100 142 112 132 L134 140 L152 158 L138 170 L132 162 L132 208 L68 208 L68 162 L62 170 L48 158 Z" fill="#ffc61a"/>
    <path d="M100 158 l6 12 13 2 -10 9 3 13 -12 -7 -12 7 3 -13 -10 -9 13 -2 Z" fill="#fff" opacity=".85"/>
    ${arm('M62 122 L36 160 L72 140', '#e6f4ff')}${arm('M138 122 L164 160 L128 140', '#e6f4ff')}
    ${hand(74, 140)}${hand(126, 140)}
    ${FACE}`),
  // 가방을 두 손으로 들고 있는 모습
  bag: () => svg(`${body('#c9f0b4')}
    <path d="M82 148 Q100 122 118 148" fill="none" stroke="#c2185b" stroke-width="7"/>
    <rect x="56" y="144" width="88" height="70" rx="22" fill="#ff7ab6"/>
    <rect x="72" y="172" width="56" height="32" rx="12" fill="#ff4f9a"/><rect x="92" y="181" width="16" height="6" rx="3" fill="#ffd1e6"/>
    ${arm('M62 122 L34 156 L86 140', '#c9f0b4')}${arm('M138 122 L166 156 L114 140', '#c9f0b4')}
    ${hand(88, 140)}${hand(112, 140)}
    ${FACE}`),
  // 책을 펼쳐 들고 읽는 모습
  book: () => svg(`${body('#ffe08a')}
    <path d="M100 142 Q76 130 50 138 L50 186 Q76 178 100 190 Q124 178 150 186 L150 138 Q124 130 100 142 Z" fill="#1fa8f0"/>
    <path d="M100 146 Q78 136 56 142 L56 180 Q78 174 100 184 Z" fill="#fff"/><path d="M100 146 Q122 136 144 142 L144 180 Q122 174 100 184 Z" fill="#f3fbff"/>
    <path d="M64 154 Q78 150 92 156 M64 164 Q78 160 92 166 M108 156 Q122 150 136 154 M108 166 Q122 160 136 164" stroke="#bfe8fb" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${arm('M62 120 Q40 150 54 160', '#ffe08a')}${arm('M138 120 Q160 150 146 160', '#ffe08a')}
    ${hand(54, 160)}${hand(146, 160)}
    ${FACE}`),
  // 두 팔 번쩍, 양손에 별
  star: () => {
    const star = (x, y, r) => `<path transform="translate(${x} ${y}) scale(${r / 10})" d="M0 -10 L2.9 -4 9.5 -3.1 4.7 1.5 5.9 8.1 0 5 -5.9 8.1 -4.7 1.5 -9.5 -3.1 -2.9 -4 Z" fill="#ffc61a" stroke="#e0a500" stroke-width="1" stroke-linejoin="round"/>`;
    return svg(`${body('#b8d8ff')}
      ${arm('M62 122 Q38 104 30 72', '#b8d8ff')}${arm('M138 122 Q162 104 170 72', '#b8d8ff')}
      ${star(30, 50, 24)}${star(170, 50, 24)}${hand(30, 70)}${hand(170, 70)}
      ${FACE}`);
  },
};

// 할 일 이름으로 그림 고르기. 부모님이 새로 만든 일은 그림이 없어서 null (그땐 3D 그림 그대로)
export function kidArt(label) {
  const k = /양치|세수|이 닦/.test(label) ? 'brush' : /옷/.test(label) ? 'clothes' : /가방/.test(label) ? 'bag'
    : /배움|책/.test(label) ? 'book' : /별/.test(label) ? 'star' : null;
  return k && ART[k]();
}
