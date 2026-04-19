import { useMemo } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

const REACTIONS = {
  water_formation: {
    equation: '2H₂ + O₂ → 2H₂O',
    reactants: [{ formula: 'H₂', coef: 2, molarMass: 2.016 }, { formula: 'O₂', coef: 1, molarMass: 31.998 }],
    products: [{ formula: 'H₂O', coef: 2, molarMass: 18.015 }],
  },
  methane_combustion: {
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    reactants: [{ formula: 'CH₄', coef: 1, molarMass: 16.043 }, { formula: 'O₂', coef: 2, molarMass: 31.998 }],
    products: [{ formula: 'CO₂', coef: 1, molarMass: 44.009 }, { formula: 'H₂O', coef: 2, molarMass: 18.015 }],
  },
  iron_hcl: {
    equation: 'Fe + 2HCl → FeCl₂ + H₂',
    reactants: [{ formula: 'Fe', coef: 1, molarMass: 55.845 }, { formula: 'HCl', coef: 2, molarMass: 36.458 }],
    products: [{ formula: 'FeCl₂', coef: 1, molarMass: 126.751 }, { formula: 'H₂', coef: 1, molarMass: 2.016 }],
  },
  sodium_water: {
    equation: '2Na + 2H₂O → 2NaOH + H₂',
    reactants: [{ formula: 'Na', coef: 2, molarMass: 22.99 }, { formula: 'H₂O', coef: 2, molarMass: 18.015 }],
    products: [{ formula: 'NaOH', coef: 2, molarMass: 39.997 }, { formula: 'H₂', coef: 1, molarMass: 2.016 }],
  },
};

export default function Stoichiometry2D(rawProps) {
  const {
    reaction = 'water_formation',
    reactantAmount = 4,
    secondaryAmount = 3,
  } = useSanitizedProps(rawProps);

  const rx = REACTIONS[reaction] || REACTIONS.water_formation;

  const { limiting, scale, productMoles } = useMemo(() => {
    const available = [reactantAmount, secondaryAmount];
    const ratios = rx.reactants.map((r, i) => (available[i] ?? 0) / r.coef);
    const minRatio = Math.min(...ratios);
    const limIdx = ratios.indexOf(minRatio);
    const products = rx.products.map(p => ({ ...p, moles: p.coef * minRatio }));
    return {
      limiting: rx.reactants[limIdx].formula,
      scale: minRatio,
      productMoles: products,
    };
  }, [reactantAmount, secondaryAmount, rx]);

  const width = 18, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const available = [reactantAmount, secondaryAmount];
  const maxMoles = Math.max(...available, ...productMoles.map(p => p.moles), 1);

  const barW = 1.2;
  const drawBars = (items, startX, color, labelPrefix) => {
    const bodies = [];
    const labels = [];
    items.forEach((it, i) => {
      const x = startX + i * (barW + 0.8);
      const amount = it.moles ?? available[i];
      const used = Math.min(amount, it.coef * scale);
      const h = (amount / maxMoles) * 5;
      const usedH = (used / maxMoles) * 5;
      bodies.push({ id: `${labelPrefix}-bg-${i}`, type: 'rect', x, y: -1.5 + h / 2, w: barW, h, fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 0.03 });
      bodies.push({ id: `${labelPrefix}-${i}`, type: 'rect', x, y: -1.5 + usedH / 2, w: barW * 0.95, h: usedH, fill: color, stroke: color, strokeWidth: 0.02 });
      labels.push({ id: `${labelPrefix}-l-${i}`, x, y: -2.1, text: it.formula, color: '#e5f8ff', fontSize: 0.32 });
      labels.push({ id: `${labelPrefix}-v-${i}`, x, y: -1.5 + h + 0.25, text: `${amount.toFixed(2)} mol`, color: '#9ca3af', fontSize: 0.26 });
    });
    return { bodies, labels };
  };

  const R = drawBars(rx.reactants.map((r, i) => ({ ...r, moles: available[i] })), -width / 2 + 1.5, 'rgba(255,170,0,0.55)', 'r');
  const P = drawBars(productMoles, 2, 'rgba(34,211,238,0.55)', 'p');

  const arrow = { id: 'arr', type: 'line', x1: -0.5, y1: 1, x2: 1.5, y2: 1, stroke: '#22d3ee', strokeWidth: 0.08 };
  const arrowHead = { id: 'ah', type: 'polygon', points: [[1.5, 1], [1.2, 1.25], [1.2, 0.75]], fill: '#22d3ee', stroke: '#22d3ee', strokeWidth: 0.02 };

  const labels = [
    { id: 'eq', x: 0, y: height / 2 - 0.6, text: rx.equation, color: '#22d3ee', fontSize: 0.46 },
    { id: 'rh', x: -width / 2 + 3, y: 3.9, text: 'Reactants', color: '#ffaa00', fontSize: 0.32 },
    { id: 'ph', x: 4, y: 3.9, text: 'Products', color: '#22d3ee', fontSize: 0.32 },
    { id: 'lim', x: 0, y: -height / 2 + 0.7, text: `Limiting reactant: ${limiting} (${scale.toFixed(2)}× rxn)`, color: '#ff8899', fontSize: 0.32 },
    ...R.labels, ...P.labels,
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...R.bodies, ...P.bodies, arrow, arrowHead]} labels={labels} />
    </div>
  );
}
