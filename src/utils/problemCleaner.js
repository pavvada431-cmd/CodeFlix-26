const UNIT_CONVERSIONS = {
  'meters': 'm', 'meter': 'm', 'metres': 'm', 'metre': 'm',
  'centimeters': 'cm', 'centimeter': 'cm', 'cms': 'cm',
  'millimeters': 'mm', 'millimeter': 'mm', 'mms': 'mm',
  'kilometers': 'km', 'kilometer': 'km', 'kms': 'km',
  'kilograms': 'kg', 'kilogram': 'kg', 'kgs': 'kg',
  'grams': 'g', 'gram': 'g', 'gs': 'g',
  'seconds': 's', 'second': 's',
  'minutes': 'min', 'minute': 'min',
  'hours': 'h', 'hour': 'h',
  'degrees': '°', 'degree': '°', 'deg': '°',
  'newtons': 'N', 'newton': 'N',
  'joules': 'J', 'joule': 'J',
  'watts': 'W', 'watt': 'W',
  'hertz': 'Hz', 'hz': 'Hz',
  'meters per second': 'm/s', 'm/s': 'm/s', 'mps': 'm/s',
  'meters per second squared': 'm/s²', 'm/s^2': 'm/s²',
  'radians per second': 'rad/s', 'rad/s': 'rad/s',
  'kelvin': 'K', 'kelvins': 'K',
  'celsius': '°C', 'fahrenheit': '°F',
  'pascals': 'Pa', 'pascal': 'Pa',
  'tesla': 'T', 'teslas': 'T',
  'amperes': 'A', 'ampere': 'A', 'amps': 'A',
  'volts': 'V', 'volt': 'V',
  'ohms': 'Ω', 'ohm': 'Ω',
  'coulombs': 'C', 'coulomb': 'C',
  'farads': 'F', 'farad': 'F',
  'henrys': 'H', 'henry': 'H',
}

const NUMERIC_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(?:meters?|metres?|m(?:\/s)?)/gi,
  /(\d+(?:\.\d+)?)\s*(?:kilograms?|kgs?|kg)/gi,
  /(\d+(?:\.\d+)?)\s*(?:grams?|gs?|g)/gi,
  /(\d+(?:\.\d+)?)\s*(?:seconds?|s)/gi,
  /(\d+(?:\.\d+)?)\s*(?:degrees?|°|deg)/gi,
  /(\d+(?:\.\d+)?)\s*(?:newtons?|N)/gi,
  /(\d+(?:\.\d+)?)\s*(?:joules?|J)/gi,
  /(\d+(?:\.\d+)?)\s*(?:watts?|W)/gi,
  /(\d+(?:\.\d+)?)\s*(?:hertz|Hz)/gi,
  /(\d+(?:\.\d+)?)\s*(?:m\/s²|m\/s\^2|m\/s2)/gi,
]

const PROBLEM_TYPE_KEYWORDS = {
  projectile: ['projectile', 'ball', 'throw', 'launch', 'bullet', 'arrow', 'cannon', 'baseball', 'basketball', 'javelin', 'soccer ball', 'football'],
  pendulum: ['pendulum', 'swing', 'simple pendulum', 'bob'],
  inclined_plane: ['inclined plane', 'ramp', 'slope', 'incline', 'friction'],
  spring_mass: ['spring', 'oscillation', 'oscillate', 'hook', 'spring constant'],
  circular_motion: ['circular', 'orbit', 'revolve', 'rotate', 'tire', 'wheel'],
  collisions: ['collision', 'collide', 'crash', 'impact', 'bounce', 'elastic', 'inelastic', 'ball collision'],
  wave_motion: ['wave', 'frequency', 'wavelength', 'amplitude', 'sound', 'light', 'sine', 'cosine'],
  rotational_mechanics: ['rotational', 'torque', 'angular', 'moment', 'spin', 'rolling'],
  orbital: ['orbit', 'satellite', 'planet', 'gravitational', 'escape velocity', 'space'],
  buoyancy: ['buoyancy', 'float', 'sink', 'fluid', 'density', 'archimedes'],
  ideal_gas: ['gas', 'ideal gas', 'temperature', 'pressure', 'volume', 'moles', 'pv=nrt'],
  electric_field: ['electric field', 'charge', 'coulomb', 'electron', 'proton'],
  optics_lens: ['lens', 'convex', 'concave', 'magnify', 'focal length', 'refraction'],
  optics_mirror: ['mirror', 'reflection', 'concave', 'convex', 'plane mirror'],
  radioactive_decay: ['radioactive', 'decay', 'half-life', 'uranium', 'carbon', 'nuclear'],
  electromagnetic: ['electromagnetic', 'magnetic', 'field', 'lorentz', 'wire'],
  titration: ['titration', 'acid', 'base', 'neutralize', 'equivalence point', 'ph'],
  combustion: ['combustion', 'burn', 'flame', 'oxidation', 'fuel', 'heat'],
  organic_chemistry: ['organic', 'alkane', 'alkene', 'alkyne', 'alcohol', 'carboxylic', 'ester', 'benzene', 'functional group', 'isomer', 'polymer', 'substitution', 'elimination'],
  stoichiometry: ['stoichiometry', 'mole', 'molar', 'limiting reagent', 'yield', 'balance'],
}

const VALUE_EXTRACTORS = {
  mass: [/mass\s*[=:]\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)?/gi, /(\d+(?:\.\d+)?)\s*kg/gi, /(\d+(?:\.\d+)?)\s*kilograms?/gi],
  velocity: [/velocity\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\/s/gi, /speed\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*meters\s*per\s*second/gi],
  angle: [/angle\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*(?:degrees?|°|deg)/gi, /(\d+(?:\.\d+)?)\s*radians?/gi],
  radius: [/radius\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:radius|r)/gi],
  length: [/length\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:length|l)/gi],
  height: [/height\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:height|h)/gi],
  k: [/spring\s*constant\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /k\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*N\/m/gi],
  temperature: [/temperature\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*(?:K|kelvin)/gi],
  pressure: [/pressure\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*(?:Pa|pascal)/gi],
  frequency: [/frequency\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*(?:Hz|hertz)/gi],
  amplitude: [/amplitude\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:amplitude)/gi],
  wavelength: [/wavelength\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:wavelength)/gi],
  initialAtoms: [/atoms?\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*atoms?/gi, /initial\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  halfLife: [/half.?life\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*(?:s|seconds?|years?|billion)/gi],
  mass1: [/mass\s*1\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /first\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  mass2: [/mass\s*2\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /second\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  velocity1: [/velocity\s*1\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /v1\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  velocity2: [/velocity\s*2\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /v2\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  centralMass: [/central\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /sun\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /earth\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  orbitingMass: [/orbiting\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /planet\s*mass\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  distance: [/distance\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*(?:distance|r)/gi],
  charge: [/charge\s*[=:]\s*(\d+(?:\.\d+)?(?:\s*[eE][\+-]?\d+)?)/gi, /(\d+(?:\.\d+)?(?:\s*[eE][\+-]?\d+)?)\s*C/gi, /electron\s*charge/gi],
  magneticField: [/magnetic\s*field\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*T/gi, /(\d+(?:\.\d+)?)\s*tesla/gi],
  friction: [/friction\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /coefficient\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /mu\s*[=:]\s*(\d+(?:\.\d+)?)/gi],
  damping: [/damping\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*damping/gi],
  focalLength: [/focal\s*length\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /f\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*cm/gi],
  objectDistance: [/object\s*distance\s*[=:]\s*(\d+(?:\.\d+)?)/gi, /(\d+(?:\.\d+)?)\s*m\s*object/gi],
}

export function cleanProblemText(text) {
  if (!text || typeof text !== 'string') return ''
  
  let cleaned = text.trim()
  
  cleaned = cleaned.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ]/g, (match) => {
    const superscripts = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','⁼':'=','⁽':'(','⁾':')','ⁿ':'n'}
    return superscripts[match]
  })
  
  cleaned = cleaned.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (match) => {
    const subscripts = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'}
    return subscripts[match]
  })
  
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  cleaned = cleaned.replace(/(\d)([a-zA-Z])/g, '$1 $2')
  cleaned = cleaned.replace(/([a-zA-Z])(\d)/g, '$1 $2')
  
  Object.entries(UNIT_CONVERSIONS).forEach(([full, abbrev]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi')
    cleaned = cleaned.replace(regex, abbrev)
  })
  
  cleaned = cleaned.replace(/([0-9])\s*\*\s*10\s*\^\s*([+-]?\d+)/gi, '1e$2')
  cleaned = cleaned.replace(/([0-9])e([+-]?\d+)/gi, (match, base, exp) => `${base}e${exp}`)
  
  cleaned = cleaned.replace(/([a-zA-Z])\s*\^\s*([0-9+-])/gi, '$1^$2')
  
  cleaned = cleaned.replace(/\bzero\b/gi, '0')
  cleaned = cleaned.replace(/\bone\b/gi, '1')
  cleaned = cleaned.replace(/\btwo\b/gi, '2')
  cleaned = cleaned.replace(/\bthree\b/gi, '3')
  cleaned = cleaned.replace(/\bfour\b/gi, '4')
  cleaned = cleaned.replace(/\bfive\b/gi, '5')
  cleaned = cleaned.replace(/\bsix\b/gi, '6')
  cleaned = cleaned.replace(/\bseven\b/gi, '7')
  cleaned = cleaned.replace(/\beight\b/gi, '8')
  cleaned = cleaned.replace(/\bnine\b/gi, '9')
  cleaned = cleaned.replace(/\bten\b/gi, '10')
  
  return cleaned
}

export function detectProblemType(text) {
  if (!text || typeof text !== 'string') return null
  
  const lowerText = text.toLowerCase()
  
  for (const [type, keywords] of Object.entries(PROBLEM_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return type
      }
    }
  }
  
  return null
}

export function extractVariables(text) {
  if (!text || typeof text !== 'string') return {}
  
  const variables = {}
  
  for (const [varName, patterns] of Object.entries(VALUE_EXTRACTORS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const value = parseFloat(match[1])
        if (Number.isFinite(value) && value > 0) {
          variables[varName] = value
          break
        }
      }
    }
  }
  
  return variables
}

export function normalizeProblemText(text) {
  const cleaned = cleanProblemText(text)
  
  return {
    original: text,
    cleaned,
    detectedType: detectProblemType(cleaned),
    extractedVariables: extractVariables(cleaned),
  }
}
