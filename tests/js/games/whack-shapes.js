/* أشكال «اصطد الصحيح» — رسومات SVG مرسومة يدويًا لكل قالب شكل (بلا وجوه ولا ذوات أرواح).
   الإجابة تُكتب على شريط تحت الشكل. */
'use strict';

const WHACK_SHAPES = {
  classic: [
    '<path d="M32 1v6" stroke="#7E2A17" stroke-width="2.5"/><path d="M25 7h14v5H25z" fill="#7E2A17"/><path d="M19 12h26l5 32H14z" fill="#E3B341"/><path d="M24 16h16l3 24H21z" fill="#FFF3C4"/><path d="M32 18v20M24 28h16" stroke="#E3B341" stroke-width="2"/><path d="M14 44h36v7H14z" fill="#7E2A17"/><path d="M26 51h12l-2 5h-8z" fill="#7E2A17"/>',
    '<g fill="#AB3920"><rect x="13" y="13" width="38" height="38" rx="4"/><rect x="13" y="13" width="38" height="38" rx="4" transform="rotate(45 32 32)"/></g><circle cx="32" cy="32" r="10" fill="#F7E7C0"/><circle cx="32" cy="32" r="4" fill="#E3B341"/>',
    '<path d="M31 3h2v9h-2z" fill="#E3B341"/><path d="M28 12a4 4 0 0 1 8 0z" fill="#E3B341"/><path d="M10 54V36a22 22 0 0 1 44 0v18z" fill="#1F7A6B"/><path d="M10 36a22 22 0 0 1 44 0" fill="none" stroke="#E3B341" stroke-width="2.5"/><path d="M25 54V42a7 7 0 0 1 14 0v12z" fill="#0F4A40"/>',
    '<path d="M42 6a26 26 0 1 0 0 52 20 20 0 1 1 0-52z" fill="#E3B341"/><path d="M48 18l1.8 4 4.2.6-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4.2-.6z" fill="#F7E7C0"/>',
  ],
  night: [
    '<circle cx="32" cy="32" r="16" fill="#8E5CC2"/><circle cx="26" cy="26" r="4" fill="#B48EE0"/><circle cx="37" cy="38" r="3" fill="#7346A8"/><ellipse cx="32" cy="34" rx="29" ry="7" fill="none" stroke="#F6E7A8" stroke-width="3.5" transform="rotate(-18 32 34)"/>',
    '<path d="M32 4l7.6 17.2L58 22.8 44 35.4l4 18.6L32 44.6 16 54l4-18.6L6 22.8l18.4-1.6z" fill="#F6E7A8"/><path d="M32 14l4.4 10L47 25l-8 7 2.3 10.6L32 37l-9.3 5.6L25 32l-8-7 10.6-1z" fill="#FFF8DA"/>',
    '<path d="M32 3c11 9 13 22 11 36H21C19 25 21 12 32 3z" fill="#E8EEF7"/><circle cx="32" cy="21" r="5.5" fill="#59C3F0" stroke="#2E4A8A" stroke-width="2"/><path d="M21 37l-9 11 11-2zM43 37l9 11-11-2z" fill="#E5554F"/><path d="M25 41h14l-7 18z" fill="#F2A516"/><path d="M28 41h8l-4 10z" fill="#FFE066"/>',
    '<circle cx="43" cy="21" r="11" fill="#9DB3D9"/><circle cx="40" cy="18" r="3" fill="#C9D7EE"/><circle cx="47" cy="25" r="2" fill="#7D93BA"/><path d="M34 28 8 52M37 32 15 58M31 23 5 43" stroke="#59C3F0" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
  ],
  garden: [
    '<path d="M24 34h16l-2 22a6 6 0 0 1-12 0z" fill="#FFF3DC"/><path d="M6 34a26 24 0 0 1 52 0z" fill="#E5554F"/><circle cx="20" cy="22" r="4" fill="#fff"/><circle cx="36" cy="16" r="3.5" fill="#fff"/><circle cx="46" cy="28" r="3" fill="#fff"/><circle cx="28" cy="29" r="2.5" fill="#fff"/>',
    '<path d="M32 30v28" stroke="#3F7D3A" stroke-width="4" stroke-linecap="round"/><path d="M32 48c-9-1-14-9-14-9 9 0 14 6 14 9zM32 42c9-1 13-8 13-8-8 0-13 5-13 8z" fill="#5FA052"/><path d="M19 8l6.5 9L32 6l6.5 11L45 8v14a13 13 0 0 1-26 0z" fill="#E5559A"/><path d="M32 6l6.5 11-6.5 15-6.5-15z" fill="#F07AAE"/>',
    '<path d="M32 40v20" stroke="#3F7D3A" stroke-width="4"/><g fill="#F7C948">' + [...Array(12)].map((_, i) => `<ellipse cx="32" cy="10" rx="5" ry="10" transform="rotate(${i * 30} 32 26)"/>`).join('') + '</g><circle cx="32" cy="26" r="9" fill="#7A4A1F"/><circle cx="29" cy="23" r="1.4" fill="#A9763E"/><circle cx="34" cy="28" r="1.4" fill="#A9763E"/>',
    '<path d="M18 50h28l-3 10H21z" fill="#C97B4A"/><path d="M15 46h34v5H15z" fill="#A85E33"/><path d="M26 46V14a6 6 0 0 1 12 0v32z" fill="#4C9A4A"/><path d="M26 30h-6a4 4 0 0 1-4-4v-8a3 3 0 0 1 6 0v6h4zM38 24h6v-6a3 3 0 0 1 6 0v8a4 4 0 0 1-4 4h-8z" fill="#4C9A4A"/><path d="M32 14v30" stroke="#3D7F3B" stroke-width="1.5"/>',
  ],
  ice: [
    '<rect x="10" y="12" width="44" height="42" rx="9" fill="#BFE3F3"/><rect x="10" y="12" width="44" height="42" rx="9" fill="none" stroke="#7CC6E8" stroke-width="2.5"/><path d="M17 20h12M17 26h6" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M42 44l6-6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>',
    '<circle cx="32" cy="32" r="27" fill="#2D7FB8"/><g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M32 10v44M13 21l38 22M13 43l38-22"/><path d="M32 10l-5 5M32 10l5 5M32 54l-5-5M32 54l5-5M13 21l2 7M13 21l7-1M51 43l-2-7M51 43l-7 1M13 43l7 1M13 43l2-7M51 21l-7-1M51 21l-2 7"/></g>',
    '<path d="M6 8h52v6H6z" fill="#E8F7FF"/><path d="M8 14l5 30 5-30zM20 14l6 40 6-40zM34 14l5 26 5-26zM46 14l5 34 5-34z" fill="#9CD5F2"/><path d="M22 18l4 26M48 18l3 20" stroke="#fff" stroke-width="1.5" opacity=".8"/>',
    '<circle cx="32" cy="34" r="24" fill="#F7FBFF"/><path d="M14 42a24 24 0 0 0 40 0" fill="#D3E9F5"/><circle cx="24" cy="24" r="5" fill="#fff"/><circle cx="40" cy="40" r="2.5" fill="#BFE3F3"/><circle cx="44" cy="28" r="1.8" fill="#BFE3F3"/>',
  ],
  notebook: [
    '<path d="M4 30 60 8 46 54 30 40z" fill="#fff" stroke="#2B4C7E" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 40l-4 16 10-11M30 40 60 8" fill="none" stroke="#2B4C7E" stroke-width="2.5" stroke-linejoin="round"/>',
    '<g transform="rotate(-35 32 32)"><rect x="8" y="24" width="38" height="16" fill="#F7C948" stroke="#2B4C7E" stroke-width="2"/><path d="M8 29h38M8 35h38" stroke="#E3A82E" stroke-width="1.5"/><rect x="2" y="24" width="8" height="16" rx="2" fill="#F4A6C1" stroke="#2B4C7E" stroke-width="2"/><path d="M46 24l14 8-14 8z" fill="#F6E0B5" stroke="#2B4C7E" stroke-width="2" stroke-linejoin="round"/><path d="M55 29.2 60 32l-5 2.8z" fill="#2B4C7E"/></g>',
    '<path d="M14 18l10-8 12 4 12-2 6 12-4 12 4 10-12 8-14-2-12 4-6-12 4-12z" fill="#F4F2EA" stroke="#5A6B88" stroke-width="2" stroke-linejoin="round"/><path d="M20 22l10 6 8-8M18 38l12-4 10 8 8-6M30 28l2 8" fill="none" stroke="#9AA6BB" stroke-width="1.6"/>',
    '<path d="M10 8h44v34L42 54H10z" fill="#FFE98A"/><path d="M54 42H42v12z" fill="#E8C94E"/><path d="M17 20h28M17 28h28M17 36h18" stroke="#B89A3A" stroke-width="2" stroke-linecap="round"/>',
  ],
};
