import React, { useMemo, useState } from 'react';

// Stefan–Boltzmann constant (W m^-2 K^-4)
const SIGMA = 5.670374419e-8;

// Baseline reference values (roughly present-day)
const BASE = {
  S: 1361, // Solar constant (W/m^2)
  albedo: 0.3, // Planetary albedo
  T_obs: 288.0, // Observed-approx global mean surface temp (K)
  C0: 280, // preindustrial CO2 (ppm)
  C_now: 420, // modern-ish CO2 (ppm)
};

// Derived: choose a constant background greenhouse forcing F0 so the model hits T_obs at baseline
function baselineGreenhouseF0() {
  const absorbed = ((1 - BASE.albedo) * BASE.S) / 4; // W/m^2
  const sigmaT4 = SIGMA * Math.pow(BASE.T_obs, 4);
  return sigmaT4 - absorbed; // W/m^2
}

const F0 = baselineGreenhouseF0();

// CO2 radiative forcing approximation (Myhre et al. 1998)
function forcingCO2(C, C0 = BASE.C0) {
  return 5.35 * Math.log(C / C0);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

export default function EnergyBalanceExercise() {
  // --- Controls (with sensible ranges) ---
  const [S, setS] = useState(BASE.S); // 1200–1500 covers wide solar swings (purely pedagogical)
  const [co2, setCO2] = useState(BASE.C_now); // 150–1200 ppm
  const [otherForcing, setOtherForcing] = useState(0); // −5 … +5 W/m^2 (aerosols, volcanoes, etc.)
  const [iceFrac, setIceFrac] = useState(0.12); // Fractional global areal ice/snow cover (0–0.6)
  const [cloudAlbedoDelta, setCloudAlbedoDelta] = useState(0); // −0.1 … +0.1
  const [landFrac, setLandFrac] = useState(0.29); // land fraction (fixed slider for exploration)

  // Albedo endpoints for simple mixing (very simplified)
  const ALBEDO = {
    ocean: 0.06,
    land: 0.25,
    ice: 0.6,
  };

  const derived = useMemo(() => {
    // Mix non-ice surface (land & ocean)
    const nonIceFrac = clamp(1 - iceFrac, 0, 1);
    const oceanFrac = clamp(1 - landFrac, 0, 1) * nonIceFrac;
    const landOnlyFrac = landFrac * nonIceFrac;

    const albedo_surface =
      oceanFrac * ALBEDO.ocean +
      landOnlyFrac * ALBEDO.land +
      iceFrac * ALBEDO.ice;

    // Planetary albedo = surface albedo + cloud tweak (still simplified, keeps result 0–0.8)
    const alpha = clamp(albedo_surface + cloudAlbedoDelta, 0.0, 0.8);

    // Radiative forcings (W/m^2)
    const Fco2 = forcingCO2(co2, BASE.C0); // W/m^2
    const Fnet = F0 + otherForcing + Fco2; // baseline greenhouse + user tweaks

    // Equilibrium energy balance: (1-α) S/4 + Fnet = σ T^4  →  T = [((1-α)S/4 + Fnet)/σ]^{1/4}
    const absorbed = ((1 - alpha) * S) / 4; // W/m^2
    const rhs = Math.max(1e-3, absorbed + Fnet); // prevent negatives
    const T = Math.pow(rhs / SIGMA, 0.25);

    const Te_noGHG = Math.pow(absorbed / SIGMA, 0.25); // effective radiating temp without greenhouse forcing

    const dT_from_baseline = T - BASE.T_obs;

    // Convert to °C
    const toC = (K) => K - 273.15;

    return {
      alpha,
      absorbed,
      Fco2,
      Fnet,
      T,
      T_C: toC(T),
      Te_noGHG,
      Te_noGHG_C: toC(Te_noGHG),
      dT_from_baseline,
      dT_from_baseline_C: toC(T) - toC(BASE.T_obs),
      oceanFrac,
      landOnlyFrac,
    };
  }, [S, co2, otherForcing, iceFrac, cloudAlbedoDelta, landFrac]);

  function resetAll() {
    setS(BASE.S);
    setCO2(BASE.C_now);
    setOtherForcing(0);
    setIceFrac(0.12);
    setCloudAlbedoDelta(0);
    setLandFrac(0.29);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Earth Energy Balance — Interactive Exercise
          </h1>
          <button
            onClick={resetAll}
            className="px-4 py-2 rounded-2xl bg-gray-900 text-white shadow hover:opacity-90"
          >
            Reset to baseline
          </button>
        </header>

        <p className="text-sm text-gray-600 leading-relaxed">
          Explore how changing solar input, greenhouse gases, ice cover, clouds,
          and other forcings affect the planet&#39;s equilibrium temperature in
          a simple zero-dimensional (0D) model. This is a teaching tool — it
          captures first-order relationships, not full climate dynamics.
        </p>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-semibold mb-2">Incoming Energy</h2>
            <Slider
              label={`Solar constant S = ${S.toFixed(0)} W/m²`}
              min={1200}
              max={1500}
              step={1}
              value={S}
              onChange={setS}
            />
            <Slider
              label={`Cloud albedo change Δα_cloud = ${cloudAlbedoDelta.toFixed(
                3
              )}`}
              min={-0.1}
              max={0.1}
              step={0.001}
              value={cloudAlbedoDelta}
              onChange={setCloudAlbedoDelta}
            />
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-2">
              Greenhouse & Forcings
            </h2>
            <Slider
              label={`CO₂ concentration = ${co2.toFixed(
                0
              )} ppm (ΔF = ${derived.Fco2.toFixed(2)} W/m²)`}
              min={150}
              max={1200}
              step={1}
              value={co2}
              onChange={setCO2}
            />
            <Slider
              label={`Other forcing (aerosols, volcanoes, land use) = ${otherForcing.toFixed(
                2
              )} W/m²`}
              min={-5}
              max={5}
              step={0.01}
              value={otherForcing}
              onChange={setOtherForcing}
            />
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-2">
              Surface Composition (Albedo)
            </h2>
            <Slider
              label={`Global ice/snow cover = ${(iceFrac * 100).toFixed(1)}%`}
              min={0}
              max={0.6}
              step={0.001}
              value={iceFrac}
              onChange={setIceFrac}
            />
            <Slider
              label={`Land fraction = ${(landFrac * 100).toFixed(1)}%`}
              min={0}
              max={0.5}
              step={0.001}
              value={landFrac}
              onChange={setLandFrac}
            />
            <p className="text-xs text-gray-500">
              Albedo refs: ocean 0.06, land 0.25, ice 0.60 (simplified mixing).
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-2">Model Notes</h2>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>
                Energy balance: <code>(1−α)S/4 + F₀ + ΔF = σT⁴</code>, with{' '}
                <code>F₀</code> chosen so the baseline hits 288 K.
              </li>
              <li>
                CO₂ forcing: <code>ΔF = 5.35·ln(C/C₀)</code> (Myhre et al.,
                1998). Other forcing is a free term.
              </li>
              <li>
                This toy model ignores heat capacity, dynamics, feedback
                complexity, and spatial patterns.
              </li>
            </ul>
          </Card>
        </div>

        {/* Outputs */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SummaryCard title="Planetary Albedo">
            <Stat label="α (with clouds)" value={derived.alpha.toFixed(3)} />
            <Stat
              label="Absorbed shortwave (W/m²)"
              value={derived.absorbed.toFixed(1)}
            />
            <div className="mt-3 text-xs text-gray-500">
              <p>
                Ocean frac: {(derived.oceanFrac * 100).toFixed(1)}% · Land frac:{' '}
                {(derived.landOnlyFrac * 100).toFixed(1)}%
              </p>
            </div>
          </SummaryCard>

          <SummaryCard title="Radiative Forcings">
            <Stat label="Baseline greenhouse F₀ (W/m²)" value={F0.toFixed(2)} />
            <Stat
              label="CO₂ forcing ΔF_CO₂ (W/m²)"
              value={derived.Fco2.toFixed(2)}
            />
            <Stat
              label="Other forcing (W/m²)"
              value={otherForcing.toFixed(2)}
            />
            <Stat
              label="Total forcing F₀+ΔF (W/m²)"
              value={derived.Fnet.toFixed(2)}
            />
          </SummaryCard>

          <SummaryCard title="Equilibrium Temperatures">
            <Stat label="Surface T (K)" value={derived.T.toFixed(2)} big />
            <Stat label="Surface T (°C)" value={derived.T_C.toFixed(2)} />
            <Stat
              label="ΔT from 288 K (°C)"
              value={derived.dT_from_baseline_C.toFixed(2)}
            />
            <div className="mt-2 text-xs text-gray-500">
              <p>
                No-greenhouse effective T: {derived.Te_noGHG.toFixed(1)} K (
                {derived.Te_noGHG_C.toFixed(1)} °C)
              </p>
            </div>
          </SummaryCard>
        </section>

        {/* Classroom prompts */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-xl font-semibold mb-2">Suggested exercises</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>
              <strong>Solar variability:</strong> Increase <em>S</em> by +1% and
              note the change in equilibrium temperature (ΔT). Why is ΔT
              relatively small compared to similar-magnitude CO₂ forcing?
            </li>
            <li>
              <strong>CO₂ doubling experiment:</strong> Set CO₂ to 560 ppm.
              Record the model&#39;s ΔF and ΔT. Compare to canonical values
              (~3.7 W/m² forcing).
            </li>
            <li>
              <strong>Ice–albedo feedback (toy):</strong> Increase ice cover by
              5 percentage points. How does α change, and what is the resulting
              ΔT? Discuss why real-world feedbacks are nonlinear and regional.
            </li>
            <li>
              <strong>Aerosol masking:</strong> Apply −1.0 W/m² in other
              forcing. What CO₂ level gives the same ΔT with other forcing set
              back to 0?
            </li>
            <li>
              <strong>Cloud tweak:</strong> Try Δα_cloud = +0.02. What forcing
              would be needed to offset this purely via CO₂ changes?
            </li>
          </ol>
        </section>

        <footer className="text-xs text-gray-500">
          Built for teaching: a compact, first-principles 0D energy balance
          model with tunable parameters. Use it to stimulate discussion, not
          prediction.
        </footer>
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 space-y-3">{children}</div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, big }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={'font-mono ' + (big ? 'text-2xl' : 'text-base')}>
        {value}
      </span>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">
          {min}–{max}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
