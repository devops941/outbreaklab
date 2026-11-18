import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import numpy as np
from app.config import settings
from app.db.repositories import get_repo, get_users_repo, get_audit_repo
from app.db.mongo import ensure_indexes
from app.security import hash_password
from app.sim.ode import run_ode_simulation
from app.sim.metrics import compute_outcome_metrics
from app.sim.cost import compute_intervention_costs
from app.sim.thresholds import find_intervention_threshold
from app.sim.sensitivity import run_sensitivity_analysis

def seed_database():
    print(f"--- Seeding OutbreakLab MongoDB Database ({settings.MONGODB_DB_NAME}) ---")
    ensure_indexes()

    users_repo = get_users_repo()
    audit_repo = get_audit_repo()
    pop_repo = get_repo("populations")
    path_repo = get_repo("pathogens")
    mat_repo = get_repo("contact_matrices")
    inv_repo = get_repo("interventions")
    scen_repo = get_repo("scenarios")
    runs_repo = get_repo("runs")
    results_repo = get_repo("run_results")
    briefs_repo = get_repo("briefs")
    cases_repo = get_repo("case_reports")
    thresh_repo = get_repo("threshold_searches")
    sens_repo = get_repo("sensitivity_analyses")

    # 1. USERS
    admin_user = users_repo.get_by_email(settings.ADMIN_EMAIL)
    if not admin_user:
        admin_user = users_repo.create({
            "email": settings.ADMIN_EMAIL.lower().strip(),
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "full_name": "OutbreakLab Administrator",
            "role": "admin"
        })
        print(f"Created Admin: {admin_user['email']}")

    analyst_user = users_repo.get_by_email("analyst@outbreaklab.local")
    if not analyst_user:
        analyst_user = users_repo.create({
            "email": "analyst@outbreaklab.local",
            "password_hash": hash_password("AnalystPass2026!"),
            "full_name": "Demo Analyst / Student",
            "role": "analyst"
        })
        print(f"Created Analyst: {analyst_user['email']}")

    owner_id = analyst_user["id"]

    # 2. POPULATIONS
    pop_list = [
        {
            "name": "Metro City District (100,000 pop)",
            "description": "High-density urban population with younger skew and tertiary hospital infrastructure.",
            "total_population": 100000,
            "hospital_beds": 350,
            "icu_beds": 60,
            "is_shared": True,
            "age_groups": [
                {"name": "0-4", "count": 6000, "initial_immunity": 0.0, "hospitalisation_rate": 0.005, "icu_fraction": 0.1, "ifr": 0.0001},
                {"name": "5-17", "count": 16000, "initial_immunity": 0.0, "hospitalisation_rate": 0.008, "icu_fraction": 0.1, "ifr": 0.0002},
                {"name": "18-49", "count": 48000, "initial_immunity": 0.0, "hospitalisation_rate": 0.025, "icu_fraction": 0.15, "ifr": 0.0015},
                {"name": "50-64", "count": 18000, "initial_immunity": 0.0, "hospitalisation_rate": 0.065, "icu_fraction": 0.25, "ifr": 0.008},
                {"name": "65+", "count": 12000, "initial_immunity": 0.0, "hospitalisation_rate": 0.18, "icu_fraction": 0.35, "ifr": 0.045}
            ]
        },
        {
            "name": "Regional Small Town (25,000 pop)",
            "description": "Balanced demographics with community hospital facilities.",
            "total_population": 25000,
            "hospital_beds": 80,
            "icu_beds": 14,
            "is_shared": True,
            "age_groups": [
                {"name": "0-4", "count": 1400, "initial_immunity": 0.0, "hospitalisation_rate": 0.005, "icu_fraction": 0.1, "ifr": 0.0001},
                {"name": "5-17", "count": 4100, "initial_immunity": 0.0, "hospitalisation_rate": 0.008, "icu_fraction": 0.1, "ifr": 0.0002},
                {"name": "18-49", "count": 10500, "initial_immunity": 0.0, "hospitalisation_rate": 0.025, "icu_fraction": 0.15, "ifr": 0.0015},
                {"name": "50-64", "count": 5200, "initial_immunity": 0.0, "hospitalisation_rate": 0.065, "icu_fraction": 0.25, "ifr": 0.008},
                {"name": "65+", "count": 3800, "initial_immunity": 0.0, "hospitalisation_rate": 0.18, "icu_fraction": 0.35, "ifr": 0.045}
            ]
        },
        {
            "name": "Rural Dispersed County (12,000 pop)",
            "description": "Aging population with limited local critical care capacity.",
            "total_population": 12000,
            "hospital_beds": 30,
            "icu_beds": 4,
            "is_shared": True,
            "age_groups": [
                {"name": "0-4", "count": 600, "initial_immunity": 0.0, "hospitalisation_rate": 0.005, "icu_fraction": 0.1, "ifr": 0.0001},
                {"name": "5-17", "count": 1800, "initial_immunity": 0.0, "hospitalisation_rate": 0.008, "icu_fraction": 0.1, "ifr": 0.0002},
                {"name": "18-49", "count": 4600, "initial_immunity": 0.0, "hospitalisation_rate": 0.025, "icu_fraction": 0.15, "ifr": 0.0015},
                {"name": "50-64", "count": 2600, "initial_immunity": 0.0, "hospitalisation_rate": 0.065, "icu_fraction": 0.25, "ifr": 0.008},
                {"name": "65+", "count": 2400, "initial_immunity": 0.0, "hospitalisation_rate": 0.18, "icu_fraction": 0.35, "ifr": 0.045}
            ]
        }
    ]

    saved_pops = []
    for p in pop_list:
        existing = pop_repo.col.find_one({"name": p["name"]})
        if not existing:
            p["owner_id"] = owner_id
            saved_pops.append(pop_repo.create(p))
        else:
            saved_pops.append(existing)

    primary_pop = saved_pops[0]

    # 3. PATHOGENS
    pathogen_list = [
        {
            "name": "Novel Flu-like Respiratory Archetype",
            "description": "Illustrative moderate respiratory pathogen with 2-day latent period and seasonal characteristics.",
            "r0": 1.8,
            "latent_period_days": 2.0,
            "infectious_period_days": 4.0,
            "hospital_stay_days": 7.0,
            "asymptomatic_fraction": 0.35,
            "relative_infectiousness_asym": 0.6,
            "waning_immunity_days": 180.0,
            "is_shared": True
        },
        {
            "name": "Fast Aerosol Super-Spreader",
            "description": "Illustrative highly contagious variant with short generation intervals (R0=3.2).",
            "r0": 3.2,
            "latent_period_days": 2.5,
            "infectious_period_days": 4.5,
            "hospital_stay_days": 9.0,
            "asymptomatic_fraction": 0.30,
            "relative_infectiousness_asym": 0.5,
            "waning_immunity_days": 0.0,
            "is_shared": True
        },
        {
            "name": "Slow-Burning Childhood Respiratory",
            "description": "Illustrative childhood cluster pathogen with moderate R0=1.5 and prolonged shedding.",
            "r0": 1.5,
            "latent_period_days": 4.0,
            "infectious_period_days": 7.0,
            "hospital_stay_days": 6.0,
            "asymptomatic_fraction": 0.45,
            "relative_infectiousness_asym": 0.4,
            "waning_immunity_days": 365.0,
            "is_shared": True
        },
        {
            "name": "Severe Elder-Vulnerable Syndrome",
            "description": "High hospitalisation and acute severity in 50+ age cohorts.",
            "r0": 2.4,
            "latent_period_days": 3.5,
            "infectious_period_days": 5.5,
            "hospital_stay_days": 12.0,
            "asymptomatic_fraction": 0.25,
            "relative_infectiousness_asym": 0.5,
            "waning_immunity_days": 0.0,
            "is_shared": True
        },
        {
            "name": "Mild High-Transmissibility Variant",
            "description": "High speed (R0=4.2) but attenuated clinical virulence and shorter stay.",
            "r0": 4.2,
            "latent_period_days": 1.8,
            "infectious_period_days": 3.8,
            "hospital_stay_days": 5.0,
            "asymptomatic_fraction": 0.50,
            "relative_infectiousness_asym": 0.7,
            "waning_immunity_days": 90.0,
            "is_shared": True
        }
    ]

    saved_pathogens = []
    for p in pathogen_list:
        existing = path_repo.col.find_one({"name": p["name"]})
        if not existing:
            p["owner_id"] = owner_id
            saved_pathogens.append(path_repo.create(p))
        else:
            saved_pathogens.append(existing)

    primary_pathogen = saved_pathogens[0]

    # 4. CONTACT MATRICES
    age_labels = ["0-4", "5-17", "18-49", "50-64", "65+"]
    matrices_list = [
        {
            "name": "Urban High-Density Commuting Matrix",
            "description": "Prem et al. synthetic urban stratified contact matrix with home, school, work, community.",
            "age_groups": age_labels,
            "is_shared": True,
            "layers": {
                "home": [
                    [1.8, 1.2, 1.5, 0.4, 0.2],
                    [1.2, 2.8, 2.2, 0.6, 0.3],
                    [1.5, 2.2, 2.6, 1.1, 0.5],
                    [0.4, 0.6, 1.1, 2.1, 0.8],
                    [0.2, 0.3, 0.5, 0.8, 1.6]
                ],
                "school": [
                    [0.5, 1.1, 0.2, 0.0, 0.0],
                    [1.1, 5.8, 1.0, 0.1, 0.0],
                    [0.2, 1.0, 0.6, 0.1, 0.0],
                    [0.0, 0.1, 0.1, 0.1, 0.0],
                    [0.0, 0.0, 0.0, 0.0, 0.0]
                ],
                "work": [
                    [0.0, 0.0, 0.1, 0.0, 0.0],
                    [0.0, 0.1, 0.4, 0.1, 0.0],
                    [0.1, 0.4, 4.8, 2.2, 0.1],
                    [0.0, 0.1, 2.2, 3.4, 0.2],
                    [0.0, 0.0, 0.1, 0.2, 0.2]
                ],
                "community": [
                    [0.4, 0.8, 1.2, 0.5, 0.3],
                    [0.8, 1.8, 1.6, 0.8, 0.5],
                    [1.2, 1.6, 2.8, 1.4, 0.9],
                    [0.5, 0.8, 1.4, 2.0, 1.1],
                    [0.3, 0.5, 0.9, 1.1, 1.9]
                ]
            }
        },
        {
            "name": "Standard Suburban Mixed Matrix",
            "description": "Standard balanced suburban contact topology.",
            "age_groups": age_labels,
            "is_shared": True,
            "layers": {
                "home": [
                    [1.9, 1.0, 1.4, 0.3, 0.1],
                    [1.0, 2.4, 2.0, 0.5, 0.2],
                    [1.4, 2.0, 2.3, 0.9, 0.4],
                    [0.3, 0.5, 0.9, 1.8, 0.6],
                    [0.1, 0.2, 0.4, 0.6, 1.4]
                ],
                "school": [
                    [0.4, 0.9, 0.2, 0.0, 0.0],
                    [0.9, 4.5, 0.8, 0.1, 0.0],
                    [0.2, 0.8, 0.4, 0.1, 0.0],
                    [0.0, 0.1, 0.1, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0, 0.0]
                ],
                "work": [
                    [0.0, 0.0, 0.1, 0.0, 0.0],
                    [0.0, 0.1, 0.3, 0.1, 0.0],
                    [0.1, 0.3, 3.6, 1.8, 0.1],
                    [0.0, 0.1, 1.8, 2.6, 0.2],
                    [0.0, 0.0, 0.1, 0.2, 0.1]
                ],
                "community": [
                    [0.3, 0.6, 0.9, 0.4, 0.2],
                    [0.6, 1.4, 1.2, 0.6, 0.4],
                    [0.9, 1.2, 2.1, 1.1, 0.7],
                    [0.4, 0.6, 1.1, 1.6, 0.9],
                    [0.2, 0.4, 0.7, 0.9, 1.5]
                ]
            }
        },
        {
            "name": "Rural Dispersed Matrix",
            "description": "Lower density informal community contacts with strong multi-generational household contact.",
            "age_groups": age_labels,
            "is_shared": True,
            "layers": {
                "home": [
                    [2.2, 1.4, 1.6, 0.6, 0.4],
                    [1.4, 2.6, 2.2, 0.8, 0.5],
                    [1.6, 2.2, 2.5, 1.2, 0.7],
                    [0.6, 0.8, 1.2, 2.2, 1.0],
                    [0.4, 0.5, 0.7, 1.0, 1.8]
                ],
                "school": [
                    [0.3, 0.7, 0.1, 0.0, 0.0],
                    [0.7, 3.2, 0.6, 0.1, 0.0],
                    [0.1, 0.6, 0.3, 0.0, 0.0],
                    [0.0, 0.1, 0.0, 0.0, 0.0],
                    [0.0, 0.0, 0.0, 0.0, 0.0]
                ],
                "work": [
                    [0.0, 0.0, 0.0, 0.0, 0.0],
                    [0.0, 0.1, 0.2, 0.1, 0.0],
                    [0.0, 0.2, 2.4, 1.2, 0.1],
                    [0.0, 0.1, 1.2, 1.8, 0.2],
                    [0.0, 0.0, 0.1, 0.2, 0.1]
                ],
                "community": [
                    [0.2, 0.4, 0.6, 0.3, 0.2],
                    [0.4, 0.9, 0.8, 0.4, 0.3],
                    [0.6, 0.8, 1.4, 0.8, 0.5],
                    [0.3, 0.4, 0.8, 1.1, 0.6],
                    [0.2, 0.3, 0.5, 0.6, 1.1]
                ]
            }
        }
    ]

    saved_matrices = []
    for m in matrices_list:
        existing = mat_repo.col.find_one({"name": m["name"]})
        if not existing:
            m["owner_id"] = owner_id
            saved_matrices.append(mat_repo.create(m))
        else:
            saved_matrices.append(existing)

    primary_matrix = saved_matrices[0]

    # 5. INTERVENTIONS
    inv_list = [
        {
            "name": "K-12 School Closure",
            "intervention_type": "contact_reduction",
            "description": "Full suspension of in-person classes, reducing school contacts by 80%.",
            "start_day": 20,
            "end_day": 90,
            "compliance": 0.95,
            "parameters": {"layer_reductions": {"school": 0.80}},
            "cost_per_day": 8500.0,
            "is_shared": True
        },
        {
            "name": "Workplace Distancing & Remote Work",
            "intervention_type": "contact_reduction",
            "description": "50% reduction in workplace physical attendance.",
            "start_day": 25,
            "end_day": 100,
            "compliance": 0.80,
            "parameters": {"layer_reductions": {"work": 0.50}},
            "cost_per_day": 15000.0,
            "is_shared": True
        },
        {
            "name": "Universal Community Masking",
            "intervention_type": "contact_reduction",
            "description": "Broad mask mandates dampening community transmission by 35%.",
            "start_day": 15,
            "end_day": 120,
            "compliance": 0.75,
            "parameters": {"layer_reductions": {"community": 0.35}},
            "cost_per_day": 2000.0,
            "is_shared": True
        },
        {
            "name": "Priority Vaccination Campaign",
            "intervention_type": "vaccination",
            "description": "500 doses per day, prioritized for seniors (65+) and high-risk adults.",
            "start_day": 40,
            "end_day": 150,
            "compliance": 0.90,
            "parameters": {"daily_doses": 500, "efficacy": 0.88, "priority_order": [4, 3, 2, 1, 0], "coverage_cap": 0.80},
            "cost_per_day": 1200.0,
            "cost_per_dose": 28.0,
            "is_shared": True
        },
        {
            "name": "Rapid Testing & Strict 7-Day Isolation",
            "intervention_type": "testing_isolation",
            "description": "Widespread rapid antigen testing detecting 45% of symptomatic cases.",
            "start_day": 15,
            "end_day": 140,
            "compliance": 0.85,
            "parameters": {"detection_rate": 0.45, "isolation_reduction": 0.80, "delay_days": 1},
            "cost_per_day": 4500.0,
            "is_shared": True
        },
        {
            "name": "Shielding Vulnerable Elderly",
            "intervention_type": "contact_reduction",
            "description": "Specialized protection guidelines reducing elder community exposures by 60%.",
            "start_day": 20,
            "end_day": 120,
            "compliance": 0.80,
            "parameters": {"layer_reductions": {"community": 0.25, "home": 0.15}},
            "cost_per_day": 1800.0,
            "is_shared": True
        },
        {
            "name": "Commercial Venue Capacity Limits",
            "intervention_type": "contact_reduction",
            "description": "Restricting restaurants, gyms, and retail to 50% capacity.",
            "start_day": 30,
            "end_day": 90,
            "compliance": 0.85,
            "parameters": {"layer_reductions": {"community": 0.40}},
            "cost_per_day": 6000.0,
            "is_shared": True
        },
        {
            "name": "Intensive Early Circuit-Breaker",
            "intervention_type": "contact_reduction",
            "description": "Short 21-day multi-sector shutdown.",
            "start_day": 25,
            "end_day": 46,
            "compliance": 0.90,
            "parameters": {"layer_reductions": {"school": 0.90, "work": 0.70, "community": 0.60}},
            "cost_per_day": 28000.0,
            "is_shared": True
        },
        {
            "name": "Late Stage Vaccination Surge",
            "intervention_type": "vaccination",
            "description": "Rapid acceleration to 1,200 doses/day starting on day 70.",
            "start_day": 70,
            "end_day": 160,
            "compliance": 0.85,
            "parameters": {"daily_doses": 1200, "efficacy": 0.90, "priority_order": [4, 3, 2, 0, 1], "coverage_cap": 0.85},
            "cost_per_day": 3000.0,
            "cost_per_dose": 30.0,
            "is_shared": True
        },
        {
            "name": "Regional Travel Screening",
            "intervention_type": "quarantine",
            "description": "Border checkpoints and inbound arrival testing.",
            "start_day": 10,
            "end_day": 120,
            "compliance": 0.75,
            "parameters": {"reduction": 0.25},
            "cost_per_day": 3200.0,
            "is_shared": True
        }
    ]

    saved_invs = []
    for inv in inv_list:
        existing = inv_repo.col.find_one({"name": inv["name"]})
        if not existing:
            inv["owner_id"] = owner_id
            saved_invs.append(inv_repo.create(inv))
        else:
            saved_invs.append(existing)

    # 6. SCENARIOS (8 pre-built scenarios)
    scenario_configs = [
        {
            "name": "Baseline Unmitigated Epidemic",
            "description": "Reference scenario with zero public health interventions implemented.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "School Closure Policy Only",
            "description": "Evaluating solitary impact of K-12 school closures from day 20 to 90.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[0]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Workplace Distancing & Remote Work",
            "description": "Assessment of 50% work attendance reduction.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[1]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Combined Non-Pharmaceutical Package (NPI)",
            "description": "Synergy of school closure, workplace telecommuting, and universal masks.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[0]["id"], saved_invs[1]["id"], saved_invs[2]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Early Targeted Vaccination Campaign",
            "description": "Rollout of 500 doses/day starting on Day 40 with elder priority.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[3]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Rapid Testing & Case Isolation",
            "description": "Diagnostic surveillance catching 45% of cases with immediate home isolation.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[4]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Comprehensive Preparedness Strategy",
            "description": "Full combined defense: NPI distancing + Testing & Isolation + Vaccination.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[0]["id"], saved_invs[2]["id"], saved_invs[3]["id"], saved_invs[4]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        },
        {
            "name": "Intensive Early Circuit-Breaker",
            "description": "Strict 3-week lockdown to suppress peak incidence below hospital capacity.",
            "population_id": primary_pop["id"],
            "pathogen_id": primary_pathogen["id"],
            "contact_matrix_id": primary_matrix["id"],
            "intervention_ids": [saved_invs[7]["id"]],
            "engine": "ode",
            "horizon_days": 180,
            "seed": 42
        }
    ]

    saved_scenarios = []
    for sc in scenario_configs:
        existing = scen_repo.col.find_one({"name": sc["name"]})
        if not existing:
            sc["owner_id"] = owner_id
            # Build node-graph visual structure
            nodes = [
                {"id": "node-pop", "type": "population", "position": {"x": 80, "y": 140}, "data": {"name": primary_pop["name"], "total": primary_pop["total_population"]}},
                {"id": "node-path", "type": "pathogen", "position": {"x": 320, "y": 80}, "data": {"name": primary_pathogen["name"], "r0": primary_pathogen["r0"]}},
                {"id": "node-mat", "type": "contacts", "position": {"x": 320, "y": 240}, "data": {"name": primary_matrix["name"]}},
                {"id": "node-sim", "type": "simulation", "position": {"x": 580, "y": 160}, "data": {"engine": sc["engine"], "horizon": sc["horizon_days"]}},
                {"id": "node-out-curve", "type": "outcome", "position": {"x": 840, "y": 80}, "data": {"type": "curve", "title": "Epidemic Curve"}},
                {"id": "node-out-hosp", "type": "outcome", "position": {"x": 840, "y": 260}, "data": {"type": "hospital", "title": "Hospital Capacity"}}
            ]
            edges = [
                {"id": "e1", "source": "node-pop", "target": "node-path"},
                {"id": "e2", "source": "node-pop", "target": "node-mat"},
                {"id": "e3", "source": "node-path", "target": "node-sim"},
                {"id": "e4", "source": "node-mat", "target": "node-sim"},
                {"id": "e5", "source": "node-sim", "target": "node-out-curve"},
                {"id": "e6", "source": "node-sim", "target": "node-out-hosp"}
            ]
            sc["nodes"] = nodes
            sc["edges"] = edges
            saved_scenarios.append(scen_repo.create(sc))
        else:
            saved_scenarios.append(existing)

    # 7. RUNS (Execute 6 pre-run simulations)
    saved_runs = []
    print("Executing seed simulations...")
    for idx in range(min(6, len(saved_scenarios))):
        sc = saved_scenarios[idx]
        existing_run = runs_repo.col.find_one({"scenario_id": sc["id"]})
        if existing_run:
            saved_runs.append(existing_run)
            continue

        active_invs = [inv_repo.get_by_id(iid) for iid in sc.get("intervention_ids", []) if inv_repo.get_by_id(iid)]
        sim_res = run_ode_simulation(
            population=primary_pop,
            pathogen=primary_pathogen,
            contact_matrix=primary_matrix,
            interventions=active_invs,
            horizon_days=sc.get("horizon_days", 180)
        )
        cost_info = compute_intervention_costs(active_invs, sim_res)
        metrics = compute_outcome_metrics(primary_pop, sim_res, cost_info)

        run_doc = runs_repo.create({
            "scenario_id": sc["id"],
            "scenario_name": sc["name"],
            "owner_id": owner_id,
            "status": "completed",
            "progress": 1.0,
            "engine": "ode",
            "horizon_days": sc.get("horizon_days", 180),
            "seed": 42,
            "metrics": metrics,
            "payload_snapshot": sc
        })

        results_repo.create({
            "run_id": run_doc["id"],
            "days": sim_res["days"],
            "daily_results": sim_res["daily_results"],
            "rt_series": sim_res["rt_series"]
        })
        saved_runs.append(run_doc)
        print(f" -> Completed seed run: {sc['name']} (Peak: {metrics['peak_infected']}, Deaths: {metrics['total_deaths']})")

    # 8. THRESHOLD SEARCH SEED
    if thresh_repo.count() == 0 and saved_scenarios:
        print("Pre-computing sample threshold search...")
        active_invs = [inv_repo.get_by_id(iid) for iid in saved_scenarios[0].get("intervention_ids", []) if inv_repo.get_by_id(iid)]
        th_res = find_intervention_threshold(
            population=primary_pop,
            pathogen=primary_pathogen,
            contact_matrix=primary_matrix,
            base_interventions=active_invs,
            target_metric="peak_hospital_occupancy",
            target_value=350.0, # Hospital bed capacity
            parameter_to_vary="contact_reduction",
            layer_name="school",
            min_bound=0.0,
            max_bound=0.90
        )
        thresh_repo.create({
            "scenario_id": saved_scenarios[0]["id"],
            "owner_id": owner_id,
            "request": {"target_metric": "peak_hospital_occupancy", "target_value": 350.0, "parameter_to_vary": "contact_reduction"},
            "result": th_res
        })

    # 9. SENSITIVITY SEED
    if sens_repo.count() == 0 and saved_scenarios:
        print("Pre-computing sample sensitivity analysis...")
        sens_res = run_sensitivity_analysis(
            population=primary_pop,
            base_pathogen=primary_pathogen,
            contact_matrix=primary_matrix,
            base_interventions=[],
            target_metric="total_deaths",
            samples=35,
            seed=42
        )
        sens_repo.create({
            "scenario_id": saved_scenarios[0]["id"],
            "owner_id": owner_id,
            "request": {"target_metric": "total_deaths", "samples": 35},
            "result": sens_res
        })

    # 10. SAMPLE CASE REPORTS (with messy illustrative rows)
    if cases_repo.count() == 0:
        raw_reports = []
        for d in range(1, 45):
            # Synthesize an early exponential curve with stochastic noise
            true_cases = int(5 * np.exp(0.08 * d) + np.random.normal(0, 3))
            raw_reports.append({
                "day": d,
                "reported_cases": max(0, true_cases),
                "reported_deaths": max(0, int(true_cases * 0.015)),
                "hospital_admissions": max(0, int(true_cases * 0.05))
            })
        cases_repo.create({
            "name": "Early Outbreak Surveillance Sentinel (Days 1-45)",
            "owner_id": owner_id,
            "data": raw_reports,
            "total_cases": sum(r["reported_cases"] for r in raw_reports)
        })

    # 11. SAMPLE POLICY BRIEF
    if briefs_repo.count() == 0 and saved_runs:
        briefs_repo.create({
            "title": "Hospital Resilience & School Closure Policy Assessment",
            "scenario_id": saved_scenarios[0]["id"],
            "run_id": saved_runs[0]["id"],
            "owner_id": owner_id,
            "summary": "Evaluation of critical care bed saturation under unmitigated vs NPI-buffered outbreak scenarios.",
            "content_json": {
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 1},
                        "content": [{"type": "text", "text": "Executive Summary & Policy Recommendations"}]
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {"type": "text", "text": "This policy brief analyzes municipal hospital occupancy under unmitigated and intervention-buffered epidemic trajectories for a novel respiratory pathogen (R0 = 1.8). Modelling indicates that without non-pharmaceutical interventions, acute hospital demand will exceed bed capacity (350 beds) by Day 42, creating a 28-day critical care deficit."}
                        ]
                    },
                    {
                        "type": "callout",
                        "attrs": {"type": "warning"},
                        "content": [{"type": "text", "text": "Crucial Finding: Combining K-12 school closures with community masking dampens peak hospital demand by 48%, successfully keeping acute admissions within operational capacity limits."}]
                    }
                ]
            }
        })

    print("--- OutbreakLab Database Seeding Completed Successfully! ---")

if __name__ == "__main__":
    seed_database()
