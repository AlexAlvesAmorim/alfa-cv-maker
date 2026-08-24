interface RectProps {
  x: number;
  y: number;
  w: number;
  h?: number;
  c?: string;
  rx?: number;
}

function R({ x, y, w, h = 4, c = '#9a8f91', rx = 2 }: RectProps) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={c} />;
}

interface CircleProps {
  cx: number;
  cy: number;
  r: number;
  c: string;
}

function C({ cx, cy, r, c }: CircleProps) {
  return <circle cx={cx} cy={cy} r={r} fill={c} />;
}

function Page({ children, bg = '#ffffff' }: { children: React.ReactNode; bg?: string }) {
  return (
    <>
      <rect width="210" height="297" fill={bg} />
      {children}
    </>
  );
}

function Classic() {
  return (
    <Page>
      <R x={60} y={26} w={90} h={9} c="#2b2b2b" />
      <R x={75} y={41} w={60} h={5} c="#777" />
      <R x={55} y={52} w={100} h={4} c="#b5b5b5" />
      <rect x={16} y={63} width={178} height={1.2} fill="#333" />
      {[74, 128, 182].map((y, section) => (
        <g key={y}>
          <R x={16} y={y} w={46} h={6} c="#2b2b2b" />
          <rect x={16} y={y + 9} width={178} height={0.9} fill="#444" />
          {[0, 1, 2].slice(0, section === 2 ? 2 : 3).map((index) => (
            <g key={index}>
              <C cx={19} cy={y + 17 + index * 8} r={1.4} c="#B3121F" />
              <R x={24} y={y + 15 + index * 8} w={150 - index * 12} h={3.5} c="#a8a8a8" />
            </g>
          ))}
        </g>
      ))}
    </Page>
  );
}

function Ats() {
  return (
    <Page>
      <R x={55} y={22} w={100} h={10} c="#111" />
      {[38, 62, 86].map((y) => (
        <g key={y}>
          <R x={80} y={y} w={50} h={5.5} c="#111" />
          <rect x={16} y={y + 9} width={178} height={1} fill="#111" />
        </g>
      ))}
      {[50 + 2, 74 + 2].map((y, row) => (
        <g key={y}>
          <R x={20} y={y} w={24} h={3.5} c="#222" />
          <R x={50} y={y} w={92 - row * 18} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={20} y={100} w={170} h={3.5} c="#a5a5a5" />
      <R x={20} y={107} w={160} h={3.5} c="#a5a5a5" />
      <R x={20} y={114} w={165} h={3.5} c="#a5a5a5" />
      <R x={20} y={132} w={40} h={5.5} c="#111" />
      <rect x={16} y={141} width={178} height={1} fill="#111" />
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <C cx={22} cy={150 + index * 8} r={1.3} c="#555" />
          <R x={27} y={148 + index * 8} w={150 - index * 15} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={20} y={190} w={36} h={5.5} c="#111" />
      <rect x={16} y={199} width={178} height={1} fill="#111" />
      {[0, 1, 2].map((col) => (
        <g key={col}>
          {[0, 1].map((row) => (
            <R key={row} x={20 + col * 60} y={206 + row * 8} w={44} h={3.5} c="#a5a5a5" />
          ))}
        </g>
      ))}
    </Page>
  );
}

function Xyz() {
  return (
    <Page>
      <R x={52} y={20} w={106} h={10} c="#1e1e1e" />
      <R x={80} y={36} w={50} h={4.5} c="#666" />
      <R x={68} y={46} w={74} h={3.5} c="#a5a5a5" />
      <R x={76} y={53} w={58} h={3.5} c="#a5a5a5" />
      <rect x={16} y={63} width={178} height={1} fill="#d9d9d6" />
      <R x={76} y={72} w={58} h={5.5} c="#1e1e1e" />
      {[84, 91, 98, 105].map((y, index) => (
        <R key={y} x={20} y={y} w={170 - index * 14} h={3.5} c="#a5a5a5" />
      ))}
      <R x={16} y={122} w={62} h={5.5} c="#1e1e1e" />
      {[0, 1].map((col) => (
        <g key={col}>
          <R x={16 + col * 92} y={134} w={78} h={4} c="#333" />
          <R x={16 + col * 92} y={142} w={60} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={16} y={158} w={70} h={5.5} c="#1e1e1e" />
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <C cx={19} cy={171 + index * 8} r={1.3} c="#1e1e1e" />
          <R x={24} y={169 + index * 8} w={152 - index * 18} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={16} y={210} w={40} h={5.5} c="#1e1e1e" />
      {[0, 1, 2].map((col) => (
        <R key={col} x={16 + col * 62} y={222} w={48} h={3.5} c="#a5a5a5" />
      ))}
    </Page>
  );
}

function Moderno() {
  return (
    <Page>
      <rect x={0} y={0} width={70} height={297} fill="#5F0A12" />
      <rect x={0} y={0} width={70} height={46} fill="#B3121F" />
      <C cx={35} cy={46} r={16} c="#ffffff" />
      <C cx={35} cy={46} r={12} c="#d9a7ad" />
      <R x={10} y={72} w={34} h={5} c="#ffffff" />
      {[82, 89, 96].map((y, index) => (
        <R key={y} x={10} y={y} w={48 - index * 6} h={3.2} c="#e8c7cb" />
      ))}
      <R x={10} y={112} w={44} h={5} c="#ffffff" />
      {[122, 129, 136].map((y, index) => (
        <R key={y} x={10} y={y} w={46 - index * 8} h={3.2} c="#e8c7cb" />
      ))}
      <R x={10} y={152} w={30} h={5} c="#ffffff" />
      {[162, 169].map((y) => (
        <R key={y} x={10} y={y} w={42} h={3.2} c="#e8c7cb" />
      ))}
      <R x={80} y={22} w={86} h={9} c="#222" />
      <R x={80} y={37} w={50} h={4.5} c="#B3121F" />
      <rect x={80} y={47} width={114} height={1.2} fill="#B3121F" />
      <R x={80} y={56} w={40} h={5} c="#B3121F" />
      {[66, 73, 80].map((y, index) => (
        <R key={y} x={80} y={y} w={112 - index * 10} h={3.5} c="#a5a5a5" />
      ))}
      <R x={80} y={98} w={62} h={5} c="#B3121F" />
      <rect x={80} y={106} width={114} height={0.8} fill="#e8c7cb" />
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <C cx={83} cy={115 + index * 8} r={1.3} c="#B3121F" />
          <R x={88} y={113 + index * 8} w={100 - index * 12} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={80} y={152} w={54} h={5} c="#B3121F" />
      <rect x={80} y={160} width={114} height={0.8} fill="#e8c7cb" />
      <R x={80} y={168} w={100} h={3.5} c="#333" />
      <R x={80} y={176} w={88} h={3.5} c="#a5a5a5" />
    </Page>
  );
}

function Executivo() {
  return (
    <Page>
      <rect x={0} y={0} width={210} height={54} fill="#3F4E63" />
      <C cx={40} cy={27} r={15} c="#ffffff" />
      <C cx={40} cy={27} r={11} c="#b8c2d1" />
      <R x={68} y={18} w={84} h={8} c="#ffffff" />
      <R x={68} y={31} w={52} h={4} c="#D6DEE7" />
      <R x={14} y={66} w={42} h={5} c="#33404F" />
      <rect x={14} y={74} width={60} height={0.9} fill="#33404F" />
      {[80, 87, 94].map((y, index) => (
        <R key={y} x={14} y={y} w={54 - index * 7} h={3.2} c="#8a8a8a" />
      ))}
      <R x={14} y={110} w={30} h={5} c="#33404F" />
      <rect x={14} y={118} width={60} height={0.9} fill="#33404F" />
      {[124, 131, 138].map((y) => (
        <R key={y} x={14} y={y} w={50} h={3.2} c="#8a8a8a" />
      ))}
      <R x={14} y={154} w={38} h={5} c="#33404F" />
      <rect x={14} y={162} width={60} height={0.9} fill="#33404F" />
      {[168, 175].map((y) => (
        <R key={y} x={14} y={y} w={46} h={3.2} c="#8a8a8a" />
      ))}
      <R x={86} y={66} w={56} h={5.5} c="#33404F" />
      <rect x={86} y={75} width={110} height={1} fill="#D6DEE7" />
      {[82, 89, 96, 103].map((y, index) => (
        <R key={y} x={86} y={y} w={108 - index * 12} h={3.5} c="#a5a5a5" />
      ))}
      <R x={86} y={122} w={66} h={5.5} c="#33404F" />
      <rect x={86} y={131} width={110} height={1} fill="#D6DEE7" />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <C cx={89} cy={140 + index * 8} r={1.3} c="#3F4E63" />
          <R x={94} y={138 + index * 8} w={96 - index * 10} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      <R x={86} y={172} w={54} h={5.5} c="#33404F" />
      <rect x={86} y={181} width={110} height={1} fill="#D6DEE7" />
      <R x={86} y={188} w={92} h={3.5} c="#a5a5a5" />
    </Page>
  );
}

function Clean() {
  return (
    <Page>
      <R x={16} y={24} w={106} h={11} c="#42C7D0" />
      {[44, 51, 58].map((y, index) => (
        <R key={y} x={16} y={y} w={88 - index * 10} h={3.8} c="#555" />
      ))}
      <rect x={152} y={14} width={42} height={56} rx={7} fill="#d9f2f4" stroke="#42C7D0" strokeWidth={1.5} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <rect key={index} x={16 + index * 13} y={72} width={2.4} height={2.4} fill="#8a8a8a" />
      ))}
      <R x={16} y={84} w={52} h={7} c="#42C7D0" />
      <R x={16} y={96} w={60} h={3.8} c="#777" />
      <R x={16} y={112} w={70} h={7} c="#42C7D0" />
      {[124, 131, 138].map((y, index) => (
        <R key={y} x={16} y={y} w={168 - index * 16} h={3.5} c="#a5a5a5" />
      ))}
      <R x={16} y={154} w={64} h={7} c="#42C7D0" />
      {[166, 173].map((y, index) => (
        <g key={y}>
          <C cx={19} cy={y + 2} r={1.4} c="#42C7D0" />
          <R x={24} y={y} w={150 - index * 20} h={3.5} c="#a5a5a5" />
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <rect key={index} x={16 + index * 13} y={192} width={2.4} height={2.4} fill="#8a8a8a" />
      ))}
      <R x={16} y={204} w={44} h={7} c="#42C7D0" />
      {[216, 223, 230].map((y, index) => (
        <R key={y} x={16} y={y} w={140 - index * 18} h={3.5} c="#a5a5a5" />
      ))}
    </Page>
  );
}

function Minimal() {
  return (
    <Page>
      <rect width={210} height={297} fill="#F2F2F0" />
      <rect x={30} y={16} width={36} height={48} rx={3} fill="#cfcfcb" />
      <R x={26} y={76} w={50} h={5.5} c="#2E2E2C" />
      {[86, 93, 100].map((y, index) => (
        <R key={y} x={76 - (46 - index * 4)} y={y} w={46 - index * 4} h={3.2} c="#7a7a78" />
      ))}
      <R x={34} y={116} w={42} h={5.5} c="#2E2E2C" />
      {[126, 133, 140, 147].map((y) => (
        <R key={y} x={32} y={y} w={44} h={3.2} c="#7a7a78" />
      ))}
      <R x={40} y={160} w={36} h={5.5} c="#2E2E2C" />
      {[170, 177].map((y) => (
        <R key={y} x={36} y={y} w={40} h={3.2} c="#7a7a78" />
      ))}
      <R x={34} y={194} w={42} h={5.5} c="#2E2E2C" />
      {[204, 211, 218].map((y) => (
        <R key={y} x={32} y={y} w={44} h={3.2} c="#7a7a78" />
      ))}
      <rect x={86} y={14} width={1.2} height={269} fill="#D9D9D6" />
      <R x={94} y={22} w={94} h={10} c="#2E2E2C" />
      <R x={94} y={38} w={46} h={4} c="#7a7a78" />
      {[50, 57, 64, 71].map((y, index) => (
        <R key={y} x={94} y={y} w={100 - index * 10} h={3.5} c="#9a9a98" />
      ))}
      <R x={94} y={88} w={68} h={6} c="#2E2E2C" />
      {[100, 107, 114, 121].map((y, index) => (
        <R key={y} x={94} y={y} w={102 - index * 8} h={3.5} c="#9a9a98" />
      ))}
    </Page>
  );
}

const THUMBS: Record<string, () => React.JSX.Element> = {
  classic: Classic,
  ats: Ats,
  xyz: Xyz,
  canva: Moderno,
  executivo: Executivo,
  clean: Clean,
  minimal: Minimal,
};

interface TemplateThumbProps {
  id: string;
}

export function TemplateThumb({ id }: TemplateThumbProps) {
  const Thumb = THUMBS[id] ?? Classic;
  return (
    <svg viewBox="0 0 210 297" role="img" aria-label={`Miniatura do modelo ${id}`}>
      <Thumb />
    </svg>
  );
}
