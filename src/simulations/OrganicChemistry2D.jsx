import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

const ATOM_COLOR = { C: '#222', H: '#eee', O: '#ff5566', N: '#3b82f6', Cl: '#22d3ee' };

const MOLECULES = {
  methane: { name: 'Methane CH₄', atoms: [{ e: 'C', x: 0, y: 0 }, { e: 'H', x: 1, y: 0.8 }, { e: 'H', x: -1, y: 0.8 }, { e: 'H', x: -1, y: -0.8 }, { e: 'H', x: 1, y: -0.8 }], bonds: [[0,1],[0,2],[0,3],[0,4]] },
  ethane: { name: 'Ethane C₂H₆', atoms: [{ e: 'C', x: -0.8, y: 0 }, { e: 'C', x: 0.8, y: 0 }, { e: 'H', x: -1.6, y: 0.8 }, { e: 'H', x: -1.6, y: -0.8 }, { e: 'H', x: -0.8, y: 1.2 }, { e: 'H', x: 1.6, y: 0.8 }, { e: 'H', x: 1.6, y: -0.8 }, { e: 'H', x: 0.8, y: -1.2 }], bonds: [[0,1],[0,2],[0,3],[0,4],[1,5],[1,6],[1,7]] },
  propane: { name: 'Propane C₃H₈', atoms: [{ e: 'C', x: -1.6, y: 0 }, { e: 'C', x: 0, y: 0.6 }, { e: 'C', x: 1.6, y: 0 }], bonds: [[0,1],[1,2]] },
  butane: { name: 'Butane C₄H₁₀', atoms: [{ e: 'C', x: -2.4, y: 0 }, { e: 'C', x: -0.8, y: 0.6 }, { e: 'C', x: 0.8, y: 0 }, { e: 'C', x: 2.4, y: 0.6 }], bonds: [[0,1],[1,2],[2,3]] },
  ethanol: { name: 'Ethanol C₂H₅OH', atoms: [{ e: 'C', x: -1.5, y: 0 }, { e: 'C', x: 0, y: 0.5 }, { e: 'O', x: 1.5, y: 0 }, { e: 'H', x: 2.6, y: 0.7 }], bonds: [[0,1],[1,2],[2,3]] },
  'acetic acid': { name: 'Acetic Acid CH₃COOH', atoms: [{ e: 'C', x: -1.5, y: 0 }, { e: 'C', x: 0, y: 0.5 }, { e: 'O', x: 1.5, y: 1 }, { e: 'O', x: 0.3, y: -1 }, { e: 'H', x: 1.4, y: -1.3 }], bonds: [[0,1],[1,2],[1,2],[1,3],[3,4]] },
  benzene: {
    name: 'Benzene C₆H₆',
    atoms: Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return { e: 'C', x: Math.cos(a) * 1.4, y: Math.sin(a) * 1.4 };
    }),
    bonds: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]],
    ring: true,
  },
};

const REACTION_NOTES = {
  combustion: 'Burns with O₂ → CO₂ + H₂O (exothermic)',
  substitution: 'An H is replaced by a halogen (free-radical mechanism)',
  addition: 'A double bond accepts atoms across it (saturation)',
  elimination: 'Atoms are removed to form a double bond',
  esterification: 'Carboxylic acid + alcohol → ester + H₂O',
  polymerization: 'Monomers link into long chains',
};

export default function OrganicChemistry2D(rawProps) {
  const { compound = 'methane', reactionType = 'combustion' } = useSanitizedProps(rawProps);

  const mol = MOLECULES[compound] || MOLECULES.methane;

  const width = 16, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const bonds = mol.bonds.map((b, i) => {
    const a = mol.atoms[b[0]]; const c = mol.atoms[b[1]];
    return { id: `bd-${i}`, type: 'line', x1: a.x, y1: a.y, x2: c.x, y2: c.y, stroke: '#9ca3af', strokeWidth: 0.08 };
  });

  const atoms = mol.atoms.map((a, i) => ({
    id: `at-${i}`, type: 'circle', x: a.x, y: a.y, r: a.e === 'H' ? 0.28 : 0.42,
    fill: ATOM_COLOR[a.e] || '#a855f7', stroke: '#fff', strokeWidth: 0.04,
  }));

  const atomLabels = mol.atoms.map((a, i) => ({
    id: `al-${i}`, x: a.x, y: a.y - 0.12, text: a.e, color: a.e === 'H' || a.e === 'C' ? '#000' : '#fff', fontSize: a.e === 'H' ? 0.22 : 0.32,
  }));

  const ring = mol.ring
    ? [{ id: 'benzring', type: 'circle', x: 0, y: 0, r: 0.8, fill: 'none', stroke: 'rgba(255,170,0,0.6)', strokeWidth: 0.05 }]
    : [];

  const labels = [
    { id: 'n', x: 0, y: height / 2 - 0.6, text: mol.name, color: '#22d3ee', fontSize: 0.42 },
    { id: 'r', x: 0, y: -height / 2 + 1.1, text: `Reaction: ${reactionType}`, color: '#ffaa00', fontSize: 0.34 },
    { id: 'rd', x: 0, y: -height / 2 + 0.55, text: REACTION_NOTES[reactionType] || '', color: '#9ca3af', fontSize: 0.28 },
    ...atomLabels,
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...bonds, ...ring, ...atoms]} labels={labels} />
    </div>
  );
}
